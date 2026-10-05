export default function handler(request, response) {
  // The values never change between deploys, so let browsers reuse them while moving between pages.
  response.setHeader('Cache-Control', 'public, max-age=600, s-maxage=86400');
  response.status(200).json({
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || ''
  });
}