/*
 * Claude Pet — Checkpoint D1: the GitHub brain (Serial-only, no display yet)
 * ---------------------------------------------------------------------------
 * What this does:
 *   - Connects to WiFi, syncs the clock over NTP.
 *   - Every POLL_INTERVAL seconds, asks the GitHub API for michaelbroley's
 *     recent activity across ALL repos.
 *   - New commits since last check  ->  FEED (resets the hunger clock).
 *   - Time since last commit drives the mood: CONTENT -> HUNGRY -> HEY -> POOP.
 *   - Everything is printed to the Serial Monitor so you can watch it work
 *     with NO screen involved. Once this is proven, we wire it to the AMOLED.
 *
 * Libraries needed (install "ArduinoJson" via Library Manager; the rest ship
 * with the ESP32 board package):
 *   WiFi, WiFiClientSecure, HTTPClient, Preferences, time.h, ArduinoJson
 *
 * Before flashing:
 *   1. Copy secrets.h.example -> secrets.h and fill in your WiFi + GitHub token.
 *   2. Open Serial Monitor at 115200 baud after upload.
 *
 * DEMO_MODE (below) uses MINUTES so you can watch the whole hungry->poop arc in
 * one sitting. Flip it to 0 for real-life HOURS once you're happy.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <time.h>
#include "secrets.h"   // WIFI_SSID, WIFI_PASS, GITHUB_USER, GITHUB_TOKEN

// ---------------------------------------------------------------------------
// Tuning
// ---------------------------------------------------------------------------
#define DEMO_MODE 1     // 1 = fast (minutes) for testing, 0 = real (hours)

#if DEMO_MODE
  const long HUNGRY_AFTER = 2  * 60;   // 2 min  -> gets hungry
  const long HEY_AFTER    = 5  * 60;   // 5 min  -> starts begging "HEY!"
  const long POOP_AFTER   = 10 * 60;   // 10 min -> leaves a mess
  const long POLL_INTERVAL = 20;       // check GitHub every 20 s
#else
  const long HUNGRY_AFTER = 4  * 3600; // 4 h
  const long HEY_AFTER    = 12 * 3600; // 12 h
  const long POOP_AFTER   = 24 * 3600; // 24 h
  const long POLL_INTERVAL = 60;       // check GitHub every 60 s
#endif

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
enum PetState { CONTENT, HUNGRY, HEY, NEGLECTED };
const char* stateName(PetState s) {
  switch (s) {
    case CONTENT:   return "CONTENT  :)";
    case HUNGRY:    return "HUNGRY   :(";
    case HEY:       return "HEY!     (o_o)/";
    case NEGLECTED: return "NEGLECTED (poop)";
  }
  return "?";
}

Preferences prefs;
String   lastEventId    = "";   // newest GitHub event id we've already counted
time_t   lastCommitTime = 0;    // epoch of the last time we were fed
PetState lastState      = CONTENT;
unsigned long lastPollMs = 0;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
time_t nowEpoch() { return time(nullptr); }

void saveState() {
  prefs.putString("lastEventId", lastEventId);
  prefs.putULong("lastCommit", (uint32_t)lastCommitTime);
}

void feed(int commits) {
  lastCommitTime = nowEpoch();
  saveState();
  Serial.printf("  >>> FED! %d new commit(s). Nom nom. Hunger clock reset.\n", commits);
  // (Checkpoint D2: trigger the eating animation + drop `commits` food pellets)
}

// ---------------------------------------------------------------------------
// WiFi + time
// ---------------------------------------------------------------------------
void connectWiFi() {
  Serial.printf("Connecting to WiFi \"%s\" ", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(400); Serial.print("."); }
  Serial.printf(" connected. IP: %s\n", WiFi.localIP().toString().c_str());
}

void syncClock() {
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  Serial.print("Syncing clock");
  while (nowEpoch() < 100000) { delay(300); Serial.print("."); }
  Serial.println(" done.");
}

// ---------------------------------------------------------------------------
// The GitHub poll
// ---------------------------------------------------------------------------
void pollGitHub() {
  WiFiClientSecure client;
  client.setInsecure();   // PoC: skip cert validation. Pin GitHub's CA later.

  HTTPClient http;
  String url = "https://api.github.com/users/" + String(GITHUB_USER) + "/events?per_page=30";
  http.begin(client, url);
  http.useHTTP10(true);   // read body to completion; avoids ArduinoJson IncompleteInput
  http.addHeader("User-Agent", "claude-pet-esp32");          // GitHub 403s w/o this!
  http.addHeader("Authorization", String("Bearer ") + GITHUB_TOKEN);
  http.addHeader("Accept", "application/vnd.github+json");
  http.addHeader("X-GitHub-Api-Version", "2022-11-28");

  int code = http.GET();
  if (code != 200) {
    Serial.printf("  [poll] GitHub returned HTTP %d", code);
    if (code == 401) Serial.print("  (bad/expired token?)");
    if (code == 403) Serial.print("  (rate limit, or missing User-Agent?)");
    if (code == 404) Serial.print("  (username wrong?)");
    Serial.println();
    http.end();
    return;
  }

  // Only pull the few fields we care about — keeps memory tiny.
  JsonDocument filter;
  filter[0]["id"]              = true;
  filter[0]["type"]            = true;
  filter[0]["payload"]["size"] = true;

  JsonDocument doc;
  String payload = http.getString();   // buffer whole body; TLS stream stalls break streaming parse
  http.end();
  Serial.printf("  [poll] body %u bytes\n", (unsigned)payload.length());
  DeserializationError err =
      deserializeJson(doc, payload, DeserializationOption::Filter(filter));
  if (err) { Serial.printf("  [poll] JSON parse error: %s\n", err.c_str()); return; }

  // Events come newest-first. Walk until we hit the last one we already saw,
  // tallying commits from any PushEvents newer than that.
  String newestId = "";
  int    newCommits = 0;
  bool   firstRun = (lastEventId.length() == 0);

  for (JsonObject ev : doc.as<JsonArray>()) {
    String id = ev["id"] | "";
    if (newestId.length() == 0) newestId = id;      // remember the top of the list
    if (id == lastEventId) break;                   // caught up to last seen
    if (String(ev["type"] | "") == "PushEvent") {
      newCommits += (int)(ev["payload"]["size"] | 0);
    }
  }

  if (firstRun) {
    // First ever poll: set a baseline, DON'T feed for all past history.
    lastEventId = newestId;
    saveState();
    Serial.println("  [poll] baseline set (ignoring past commits).");
  } else if (newestId.length() && newestId != lastEventId) {
    lastEventId = newestId;
    if (newCommits > 0) feed(newCommits);
    else { saveState(); Serial.println("  [poll] new activity, but no commits."); }
  } else {
    Serial.println("  [poll] no new commits.");
  }
}

// ---------------------------------------------------------------------------
// Mood, from time-since-fed
// ---------------------------------------------------------------------------
void updateState() {
  long sinceFed = (long)(nowEpoch() - lastCommitTime);
  PetState s = CONTENT;
  if      (sinceFed >= POOP_AFTER)   s = NEGLECTED;
  else if (sinceFed >= HEY_AFTER)    s = HEY;
  else if (sinceFed >= HUNGRY_AFTER) s = HUNGRY;

  if (s != lastState) {
    Serial.printf("  *** state -> %s   (last fed %ld s ago)\n", stateName(s), sinceFed);
    lastState = s;
    // (Checkpoint D2: switch the on-screen animation to match `s`)
  }
}

// ---------------------------------------------------------------------------
// Setup / loop
// ---------------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== Claude Pet — GitHub brain (D1) ===");

  prefs.begin("pet", false);
  lastEventId    = prefs.getString("lastEventId", "");
  lastCommitTime = (time_t)prefs.getULong("lastCommit", 0);

  connectWiFi();
  syncClock();

  // If we've never been fed, start the clock now so we begin CONTENT, not starving.
  if (lastCommitTime == 0) { lastCommitTime = nowEpoch(); saveState(); }

  Serial.printf("Watching commits for: %s (all repos)\n", GITHUB_USER);
  Serial.printf("Mode: %s   poll every %ld s\n",
                DEMO_MODE ? "DEMO (minutes)" : "REAL (hours)", POLL_INTERVAL);
  Serial.println("Make a commit and watch below. Ctrl-nothing — just wait.\n");

  pollGitHub();   // immediate first check
}

void loop() {
  unsigned long ms = millis();
  if (ms - lastPollMs >= (unsigned long)POLL_INTERVAL * 1000UL) {
    lastPollMs = ms;
    pollGitHub();
  }
  updateState();
  delay(500);
}
