import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

const cities = [
  { name: 'Москва', coordinates: '55.7558,37.6176' },
  { name: 'Санкт-Петербург', coordinates: '59.9343,30.3351' },
  { name: 'Казань', coordinates: '55.8304,49.0661' }
];

async function parseRealCourts() {
  for (const city of cities) {
    const { data } = await axios.get(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=padel+courts+${city.name}&key=${GOOGLE_API_KEY}`
    );

    for (const result of data.results) {
      await prisma.court.upsert({
        where: { placeId: result.place_id },
        update: {},
        create: {
          placeId: result.place_id,
          name: result.name,
          address: result.formatted_address,
          coordinates: {
            set: {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng
            }
          },
          rating: result.rating,
          city: city.name
        }
      });
    }
  }
}

parseRealCourts()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());