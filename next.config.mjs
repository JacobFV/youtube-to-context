/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    "ffmpeg-static",
    "ffprobe-static",
    "sharp",
    "youtube-dl-exec"
  ]
};

export default nextConfig;
