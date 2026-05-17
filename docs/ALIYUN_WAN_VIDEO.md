# Aliyun Wan image-to-video provider

The video generation step uses a generic provider interface under `lib/ai/video/`.
The current default provider is Aliyun DashScope Wan image-to-video, with FFmpeg static-video fallback.

## Runtime settings

```env
VIDEO_PROVIDER="aliyun-wan"
VIDEO_FALLBACK_MODE="ffmpeg"
VIDEO_GENERATION_CONCURRENCY="1"

DASHSCOPE_API_KEY="your DashScope API key"
ALIYUN_WAN_BASE_URL="https://dashscope.aliyuncs.com/api/v1"
ALIYUN_WAN_PUBLIC_BASE_URL="https://your-public-domain.example.com"
ALIYUN_WAN_MODEL="wan2.7-i2v"
ALIYUN_WAN_REQUEST_MODE="media"
ALIYUN_WAN_IMAGE_SOURCE="auto"
ALIYUN_WAN_RESOLUTION="720P"
ALIYUN_WAN_DURATION="5"
ALIYUN_WAN_PROMPT_EXTEND="true"
ALIYUN_WAN_WATERMARK="false"
ALIYUN_WAN_AUDIO="true"
ALIYUN_WAN_SHOT_TYPE=""
ALIYUN_WAN_POLL_INTERVAL_MS="15000"
ALIYUN_WAN_POLL_TIMEOUT_MS="1800000"
```

## Image input modes

`ALIYUN_WAN_REQUEST_MODE="media"` is intended for newer Wan models such as `wan2.7-i2v`.
In this mode, the model service must be able to fetch storyboard images through a public URL.
Set `ALIYUN_WAN_PUBLIC_BASE_URL` to the externally reachable app URL, for example a Cloudflare Tunnel domain.

`ALIYUN_WAN_REQUEST_MODE="img_url"` is provided for older Wan image-to-video models.
When `ALIYUN_WAN_IMAGE_SOURCE="auto"`, this mode sends local storyboard images as base64 data URIs.

## Fallback behavior

`VIDEO_FALLBACK_MODE="ffmpeg"` keeps the workflow usable when Wan is not configured, fails, or times out.
Fallback clips are generated from storyboard images with local FFmpeg and are marked with `provider: "ffmpeg-fallback"`.

Set `VIDEO_FALLBACK_MODE="error"` if production should fail instead of generating fallback clips.

## Audio

`ALIYUN_WAN_AUDIO="true"` requests Wan to generate audio when the selected model supports it.
Downloaded Wan videos are normalized with FFmpeg while preserving audio and transcoding it to AAC for MP4 compatibility.
FFmpeg fallback clips remain silent because they are generated from still images locally.
