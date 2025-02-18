export default function handler(req, res) {
  res.status(200).json({
    hasProjectId: !!process.env.NEXT_PUBLIC_INFURA_PROJECT_ID,
    hasProjectSecret: !!process.env.NEXT_PUBLIC_INFURA_PROJECT_SECRET,
    projectIdPrefix: process.env.NEXT_PUBLIC_INFURA_PROJECT_ID ? process.env.NEXT_PUBLIC_INFURA_PROJECT_ID.slice(0, 4) + '...' : 'not set'
  });
}
