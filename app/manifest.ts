import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Financial Agentic AI',
    short_name: 'FinAgent',
    description: 'MVP for agentic AI financial planner',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f4f4',
    theme_color: '#008CD4',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
