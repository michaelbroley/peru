import type { ImageMetadata } from 'astro';

import limaClifftop from '../images/aerial-view-armendariz-downhill-miraflores-town-costa-verde-reef-lima-peru.webp';
import limaCoast from '../images/aerial-view-miraflores-district-larcomar-panoramic-aerial-view-lima-city-peru.webp';
import limaPlaza from '../images/plaza-mayor-historic-center-lima-peru-downtown-cathedral-main-church.webp';
import rainbowMountain from '../images/hiking-scene-vinicunca-cusco-region-peru-montana-de-siete-colores-rainbow-mountain.webp';
import machuPicchu from '../images/historic-sanctuary-machu-picchu-mountain-ridge-eastern-cordillera-southern-peru-andes.webp';
import dancers from '../images/peruvian-folkloric-dance-church-san-pedro-apostle-andahuaylillas-near-cusco-peru.webp';
import trekker from '../images/trekker-palccoyo-rainbow-mountains-cusco-peru-colorful-landscape-andes.webp';
import puno from '../images/view-puno-from-lake-titicaca-peru.webp';
import terraces from '../images/scenic-view-mountains.webp';
import urosIsland from '../images/totora-boat-titicaca-lake-near-puno-peru-1.webp';

/**
 * Photographs used as section and leg headers, keyed so the content can
 * reference one by name instead of carrying a file path.
 *
 * Alt text describes what's actually in the frame — these are illustrative
 * rather than informational, so the descriptions stay short.
 *
 * Unused from the upload, kept for later: aerial-view-cityscape-against-sky,
 * basilica-cathedral-lima, funny-alpaca-lama-pacos, parque-del-amor,
 * totora-boat-titicaca-lake-near-puno-peru.
 */
export interface Cover {
  src: ImageMetadata;
  alt: string;
  /** object-position, where the interesting part isn't the centre. */
  focus?: string;
}

export const covers = {
  'lima-coast': {
    src: limaCoast,
    alt: 'The Lima coastline from the air, Miraflores stretching along the cliffs above the Pacific',
    focus: '50% 60%',
  },
  'lima-clifftop': {
    src: limaClifftop,
    alt: 'The Costa Verde highway curving beneath the green Miraflores cliffs in Lima',
    focus: '50% 55%',
  },
  'lima-plaza': {
    src: limaPlaza,
    alt: "Lima's Plaza Mayor, the cathedral and palm trees in the historic centre",
    focus: '50% 55%',
  },
  'rainbow-mountain': {
    src: rainbowMountain,
    alt: 'A walker in a bright woven poncho looking out over the striped slopes of Vinicunca, the Rainbow Mountain',
    focus: '55% 50%',
  },
  'machu-picchu': {
    src: machuPicchu,
    alt: 'Machu Picchu on its ridge at golden hour, Huayna Picchu behind',
    focus: '50% 50%',
  },
  dancers: {
    src: dancers,
    alt: 'Peruvian folkloric dancers in feathered costumes outside the church at Andahuaylillas, near Cusco',
    focus: '50% 45%',
  },
  trekker: {
    src: trekker,
    alt: 'A trekker sitting on a ridge above the coloured slopes of Palccoyo in the Andes',
    focus: '50% 50%',
  },
  'titicaca-puno': {
    src: puno,
    alt: 'Puno seen from Lake Titicaca, the town climbing the hillside above the water',
    focus: '50% 55%',
  },
  terraces: {
    src: terraces,
    alt: 'Curved Inca agricultural terraces cut into a green valley under a wide Andean sky',
    focus: '50% 50%',
  },
  uros: {
    src: urosIsland,
    alt: 'A floating island of totora reeds on Lake Titicaca, reed boats moored alongside',
    focus: '50% 55%',
  },
} satisfies Record<string, Cover>;

export type CoverKey = keyof typeof covers;

export function getCover(key: string | undefined): Cover | undefined {
  if (!key) return undefined;
  return (covers as Record<string, Cover>)[key];
}
