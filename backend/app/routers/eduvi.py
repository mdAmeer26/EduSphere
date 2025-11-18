import os
import uuid
import base64
import json
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel

from app.utils.storage import load_list, save_list

# Load .env file if exists
try:
    from dotenv import load_dotenv
    # Try multiple possible locations for .env file
    current_dir = os.path.dirname(__file__)
    backend_dir = os.path.abspath(os.path.join(current_dir, '..', '..'))
    env_path = os.path.join(backend_dir, '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path, override=True)
    else:
        # Fallback: try root directory
        root_dir = os.path.abspath(os.path.join(backend_dir, '..'))
        env_path = os.path.join(root_dir, '.env')
        if os.path.exists(env_path):
            load_dotenv(env_path, override=True)
except Exception as e:
    print(f"Warning: Could not load .env file: {e}")


router = APIRouter()

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".."))
IMG_DIR = os.path.join(ROOT, "uploads", "eduvi_images")
VID_DIR = os.path.join(ROOT, "uploads", "eduvi_videos")
PROJECTS_STORE = os.path.join(ROOT, "uploads", "eduvi_projects.json")
GENERATIONS_STORE = os.path.join(ROOT, "uploads", "eduvi_generations.json")
STYLES_STORE = os.path.join(ROOT, "uploads", "eduvi_styles.json")
os.makedirs(IMG_DIR, exist_ok=True)
os.makedirs(VID_DIR, exist_ok=True)

try:
    from openai import OpenAI
except Exception:
    OpenAI = None


class TextToImageRequest(BaseModel):
    prompt: str
    style: str = "cinematic"
    model: str = "dall-e-3"
    size: str = "1024x1024"
    quality: str = "hd"
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None
    guidance_scale: float = 7.5
    num_images: int = 1


class TextToVideoRequest(BaseModel):
    prompt: str
    duration: int = 5
    fps: int = 24
    resolution: str = "1080p"
    style: str = "cinematic"
    camera_motion: str = "static"
    motion_strength: float = 0.5
    negative_prompt: Optional[str] = None
    seed: Optional[int] = None


class ImageToVideoRequest(BaseModel):
    image_id: str
    prompt: str
    duration: int = 5
    motion_strength: float = 0.5
    camera_motion: str = "zoom_in"


class VideoEditRequest(BaseModel):
    video_id: str
    operation: str
    parameters: Dict[str, Any]


class StylePreset(BaseModel):
    name: str
    description: str
    image_settings: Dict[str, Any]
    video_settings: Dict[str, Any]


# ==================== IMAGE GENERATION ====================

@router.post("/image/generate")
async def generate_image(req: TextToImageRequest) -> Dict[str, Any]:
    """
    Advanced text-to-image generation with style presets and quality settings.
    Supports multiple AI models and advanced parameters.
    """
    generation_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Build enhanced prompt with style
    enhanced_prompt = req.prompt
    if req.style and req.style != "none":
        style_descriptions = {
            "cinematic": "cinematic lighting, film grain, movie quality, dramatic composition",
            "photorealistic": "photorealistic, ultra detailed, 8K resolution, professional photography",
            "artistic": "artistic painting, vibrant colors, creative composition, masterpiece",
            "anime": "anime style, vibrant colors, detailed illustration, manga art",
            "3d_render": "3D render, octane render, unreal engine, volumetric lighting",
            "fantasy": "fantasy art, magical atmosphere, epic composition, detailed environment",
            "minimalist": "minimalist design, clean composition, simple shapes, modern aesthetic",
            "vintage": "vintage photography, retro style, film aesthetic, nostalgic mood",
            "cyberpunk": "cyberpunk style, neon lights, futuristic cityscape, dark atmosphere",
            "watercolor": "watercolor painting, soft colors, artistic brushstrokes, dreamy quality"
        }
        if req.style in style_descriptions:
            enhanced_prompt = f"{req.prompt}, {style_descriptions[req.style]}"
    
    # Add negative prompt
    if req.negative_prompt:
        enhanced_prompt += f"\nAvoid: {req.negative_prompt}"
    
    images = []
    api_key = os.environ.get("OPENAI_API_KEY")
    
    # Fallback: Read directly from .env file if not in environment
    if not api_key:
        try:
            env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env')
            if os.path.exists(env_file):
                with open(env_file, 'r') as f:
                    for line in f:
                        if line.startswith('OPENAI_API_KEY='):
                            api_key = line.split('=', 1)[1].strip()
                            break
        except:
            pass
    
    if api_key and OpenAI is not None:
        try:
            client = OpenAI(api_key=api_key)
            
            for i in range(req.num_images):
                image_id = str(uuid.uuid4())
                out_path = os.path.join(IMG_DIR, f"{image_id}.png")
                
                # Generate with DALL-E 3
                resp = client.images.generate(
                    model=req.model,
                    prompt=enhanced_prompt[:4000],  # DALL-E 3 limit
                    size=req.size,
                    quality=req.quality,
                    n=1
                )
                
                # Download image
                import urllib.request
                url = resp.data[0].url
                with urllib.request.urlopen(url) as response:
                    img_bytes = response.read()
                
                with open(out_path, 'wb') as f:
                    f.write(img_bytes)
                
                images.append({
                    "id": image_id,
                    "url": f"/files/eduvi_images/{image_id}.png",
                    "size": len(img_bytes),
                    "revised_prompt": getattr(resp.data[0], 'revised_prompt', enhanced_prompt)
                })
            
            generation = {
                "id": generation_id,
                "type": "image",
                "prompt": req.prompt,
                "enhanced_prompt": enhanced_prompt,
                "style": req.style,
                "model": req.model,
                "images": images,
                "settings": {
                    "size": req.size,
                    "quality": req.quality,
                    "guidance_scale": req.guidance_scale,
                    "seed": req.seed
                },
                "status": "completed",
                "created_at": timestamp
            }
            
            generations = load_list(GENERATIONS_STORE)
            generations.append(generation)
            save_list(GENERATIONS_STORE, generations)
            
            return {
                "ok": True,
                "generation_id": generation_id,
                "images": images,
                "status": "completed"
            }
            
        except Exception as e:
            # Log the actual error
            print(f"OpenAI generation failed: {type(e).__name__}: {str(e)}")
            import traceback
            traceback.print_exc()
            # Fall through to placeholder on error
            pass
    
    # Placeholder generation using PIL
    try:
        from PIL import Image, ImageDraw, ImageFont
        
        for i in range(req.num_images):
            image_id = str(uuid.uuid4())
            out_path = os.path.join(IMG_DIR, f"{image_id}.png")
            
            # Create artistic placeholder
            img = Image.new('RGB', (1024, 1024), color='#667eea')
            draw = ImageDraw.Draw(img)
            
            # Add gradient effect
            for y in range(1024):
                color_val = int(102 + (126 - 102) * (y / 1024))
                draw.rectangle([(0, y), (1024, y+1)], fill=(color_val, 126, 234))
            
            # Add text
            text_lines = [
                "EduVI - AI Image Generation",
                "",
                f"Style: {req.style}",
                "",
                f"Prompt: {req.prompt[:80]}..."
            ]
            
            y_offset = 350
            for line in text_lines:
                draw.text((100, y_offset), line, fill='white')
                y_offset += 40
            
            img.save(out_path)
            
            images.append({
                "id": image_id,
                "url": f"/files/eduvi_images/{image_id}.png",
                "size": os.path.getsize(out_path),
                "note": "Placeholder - Configure OPENAI_API_KEY for real generation"
            })
        
        generation = {
            "id": generation_id,
            "type": "image",
            "prompt": req.prompt,
            "style": req.style,
            "images": images,
            "status": "placeholder",
            "created_at": timestamp
        }
        
        generations = load_list(GENERATIONS_STORE)
        generations.append(generation)
        save_list(GENERATIONS_STORE, generations)
        
        return {
            "ok": True,
            "generation_id": generation_id,
            "images": images,
            "status": "placeholder",
            "note": "Using placeholder. Configure OPENAI_API_KEY for AI generation."
        }
        
    except Exception as e:
        return {"error": f"Image generation failed: {str(e)}"}


# ==================== VIDEO GENERATION ====================

@router.post("/video/generate")
async def generate_video(req: TextToVideoRequest) -> Dict[str, Any]:
    """
    Advanced text-to-video generation with camera controls and motion settings.
    Simulates Runway ML / Veo-style video generation.
    """
    generation_id = str(uuid.uuid4())
    video_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    # Build enhanced prompt with style and camera motion
    enhanced_prompt = req.prompt
    
    style_descriptions = {
        "cinematic": "cinematic quality, film grain, professional color grading",
        "realistic": "photorealistic, natural lighting, high detail",
        "animated": "animated style, smooth motion, vibrant colors",
        "timelapse": "timelapse effect, smooth transitions, dynamic movement",
        "slow_motion": "slow motion, detailed movement, cinematic timing",
        "drone": "aerial drone footage, sweeping camera movements",
        "documentary": "documentary style, natural lighting, authentic feel"
    }
    
    if req.style in style_descriptions:
        enhanced_prompt += f", {style_descriptions[req.style]}"
    
    camera_descriptions = {
        "static": "static camera, no camera movement",
        "pan_left": "camera pans left smoothly",
        "pan_right": "camera pans right smoothly",
        "zoom_in": "camera zooms in gradually",
        "zoom_out": "camera zooms out gradually",
        "dolly_forward": "camera moves forward smoothly",
        "dolly_backward": "camera moves backward smoothly",
        "orbit": "camera orbits around subject",
        "crane_up": "camera cranes up vertically",
        "crane_down": "camera cranes down vertically"
    }
    
    if req.camera_motion in camera_descriptions:
        enhanced_prompt += f", {camera_descriptions[req.camera_motion]}"
    
    # Create video project
    out_path = os.path.join(VID_DIR, f"{video_id}.mp4")
    
    # In production, integrate with:
    # - Runway ML Gen-2/Gen-3
    # - Google Veo
    # - Pika Labs
    # - Stability AI Video
    
    # For now, create a placeholder video using moviepy
    try:
        # Try to use moviepy if available
        try:
            from moviepy.editor import ColorClip, TextClip, CompositeVideoClip
            import numpy as np
            
            duration = req.duration
            fps = req.fps
            
            # Create gradient background
            bg = ColorClip(size=(1920, 1080), color=(102, 126, 234), duration=duration)
            
            # Add animated text
            txt = TextClip(
                f"EduVI Video Generation\n\n{req.prompt[:100]}\n\nStyle: {req.style}\nCamera: {req.camera_motion}",
                fontsize=50,
                color='white',
                size=(1600, 800),
                method='caption',
                align='center'
            )
            txt = txt.set_position('center').set_duration(duration)
            
            # Composite
            video = CompositeVideoClip([bg, txt])
            video.fps = fps
            video.write_videofile(out_path, codec='libx264', audio=False, verbose=False, logger=None)
            
            placeholder_used = True
            
        except ImportError:
            # Fallback: Create minimal placeholder file
            placeholder_used = True
            with open(out_path, 'wb') as f:
                f.write(b'MP4 placeholder - Install moviepy or configure video generation API')
        
        file_size = os.path.getsize(out_path) if os.path.exists(out_path) else 0
        
        generation = {
            "id": generation_id,
            "type": "video",
            "video_id": video_id,
            "prompt": req.prompt,
            "enhanced_prompt": enhanced_prompt,
            "style": req.style,
            "url": f"/files/eduvi_videos/{video_id}.mp4",
            "settings": {
                "duration": req.duration,
                "fps": req.fps,
                "resolution": req.resolution,
                "camera_motion": req.camera_motion,
                "motion_strength": req.motion_strength,
                "seed": req.seed
            },
            "status": "placeholder" if placeholder_used else "completed",
            "size": file_size,
            "created_at": timestamp,
            "note": "Integrate Runway ML, Google Veo, or Pika Labs for production AI video generation"
        }
        
        generations = load_list(GENERATIONS_STORE)
        generations.append(generation)
        save_list(GENERATIONS_STORE, generations)
        
        return {
            "ok": True,
            "generation_id": generation_id,
            "video_id": video_id,
            "url": f"/files/eduvi_videos/{video_id}.mp4",
            "status": "placeholder",
            "note": "Placeholder video created. Configure Runway ML API for real AI video generation."
        }
        
    except Exception as e:
        return {"error": f"Video generation failed: {str(e)}"}


@router.post("/video/image-to-video")
async def image_to_video(req: ImageToVideoRequest) -> Dict[str, Any]:
    """
    Convert static image to animated video with motion.
    Similar to Runway ML's image-to-video feature.
    """
    generation_id = str(uuid.uuid4())
    video_id = str(uuid.uuid4())
    timestamp = datetime.utcnow().isoformat() + "Z"
    
    source_image = os.path.join(IMG_DIR, f"{req.image_id}.png")
    out_path = os.path.join(VID_DIR, f"{video_id}.mp4")
    
    if not os.path.exists(source_image):
        return {"error": "Source image not found"}
    
    try:
        from moviepy.editor import ImageClip, TextClip, CompositeVideoClip
        
        # Load image and create video
        img_clip = ImageClip(source_image, duration=req.duration)
        
        # Add motion effect based on camera_motion
        if req.camera_motion == "zoom_in":
            img_clip = img_clip.resize(lambda t: 1 + 0.3 * t / req.duration)
        elif req.camera_motion == "zoom_out":
            img_clip = img_clip.resize(lambda t: 1.3 - 0.3 * t / req.duration)
        elif req.camera_motion == "pan_right":
            img_clip = img_clip.set_position(lambda t: (-200 * t / req.duration, 'center'))
        elif req.camera_motion == "pan_left":
            img_clip = img_clip.set_position(lambda t: (200 * t / req.duration, 'center'))
        
        img_clip.fps = 24
        img_clip.write_videofile(out_path, codec='libx264', audio=False, verbose=False, logger=None)
        
        generation = {
            "id": generation_id,
            "type": "image_to_video",
            "video_id": video_id,
            "source_image_id": req.image_id,
            "prompt": req.prompt,
            "url": f"/files/eduvi_videos/{video_id}.mp4",
            "settings": {
                "duration": req.duration,
                "camera_motion": req.camera_motion,
                "motion_strength": req.motion_strength
            },
            "status": "completed",
            "size": os.path.getsize(out_path),
            "created_at": timestamp
        }
        
        generations = load_list(GENERATIONS_STORE)
        generations.append(generation)
        save_list(GENERATIONS_STORE, generations)
        
        return {
            "ok": True,
            "generation_id": generation_id,
            "video_id": video_id,
            "url": f"/files/eduvi_videos/{video_id}.mp4"
        }
        
    except ImportError:
        return {"error": "MoviePy not installed. Run: pip install moviepy"}
    except Exception as e:
        return {"error": f"Image-to-video conversion failed: {str(e)}"}


# ==================== VIDEO EDITING ====================

@router.post("/video/edit")
async def edit_video(req: VideoEditRequest) -> Dict[str, Any]:
    """
    Advanced video editing operations: trim, speed, filters, transitions.
    """
    video_path = os.path.join(VID_DIR, f"{req.video_id}.mp4")
    
    if not os.path.exists(video_path):
        return {"error": "Video not found"}
    
    try:
        from moviepy.editor import VideoFileClip
        
        video = VideoFileClip(video_path)
        edited_video_id = str(uuid.uuid4())
        out_path = os.path.join(VID_DIR, f"{edited_video_id}.mp4")
        
        if req.operation == "trim":
            start = req.parameters.get("start", 0)
            end = req.parameters.get("end", video.duration)
            video = video.subclip(start, end)
            
        elif req.operation == "speed":
            speed_factor = req.parameters.get("factor", 1.0)
            video = video.speedx(speed_factor)
            
        elif req.operation == "reverse":
            video = video.fx(lambda clip: clip.time_mirror())
            
        elif req.operation == "resize":
            width = req.parameters.get("width", 1920)
            height = req.parameters.get("height", 1080)
            video = video.resize((width, height))
        
        video.write_videofile(out_path, codec='libx264', audio_codec='aac', verbose=False, logger=None)
        video.close()
        
        return {
            "ok": True,
            "original_video_id": req.video_id,
            "edited_video_id": edited_video_id,
            "url": f"/files/eduvi_videos/{edited_video_id}.mp4",
            "operation": req.operation
        }
        
    except ImportError:
        return {"error": "MoviePy not installed"}
    except Exception as e:
        return {"error": f"Video editing failed: {str(e)}"}


# ==================== STYLE PRESETS ====================

@router.get("/styles")
async def get_styles() -> Dict[str, Any]:
    """Get all available style presets for image and video generation."""
    
    default_styles = [
        {
            "id": "cinematic",
            "name": "Cinematic",
            "description": "Film-quality visuals with dramatic lighting and composition",
            "thumbnail": "🎬",
            "category": "professional"
        },
        {
            "id": "photorealistic",
            "name": "Photorealistic",
            "description": "Ultra-realistic photos with natural lighting",
            "thumbnail": "📷",
            "category": "realistic"
        },
        {
            "id": "artistic",
            "name": "Artistic",
            "description": "Creative artwork with vibrant colors and unique style",
            "thumbnail": "🎨",
            "category": "artistic"
        },
        {
            "id": "anime",
            "name": "Anime",
            "description": "Japanese animation style with detailed illustrations",
            "thumbnail": "🌸",
            "category": "artistic"
        },
        {
            "id": "3d_render",
            "name": "3D Render",
            "description": "High-quality 3D rendered images with realistic lighting",
            "thumbnail": "🎮",
            "category": "3d"
        },
        {
            "id": "fantasy",
            "name": "Fantasy",
            "description": "Magical and epic fantasy art",
            "thumbnail": "🐉",
            "category": "artistic"
        },
        {
            "id": "minimalist",
            "name": "Minimalist",
            "description": "Clean and simple modern design",
            "thumbnail": "⚪",
            "category": "design"
        },
        {
            "id": "vintage",
            "name": "Vintage",
            "description": "Retro film aesthetic with nostalgic mood",
            "thumbnail": "📼",
            "category": "retro"
        },
        {
            "id": "cyberpunk",
            "name": "Cyberpunk",
            "description": "Futuristic cityscape with neon lights",
            "thumbnail": "🌃",
            "category": "scifi"
        },
        {
            "id": "watercolor",
            "name": "Watercolor",
            "description": "Soft watercolor painting with artistic brushstrokes",
            "thumbnail": "🖌️",
            "category": "artistic"
        }
    ]
    
    return {"styles": default_styles}


@router.get("/camera-motions")
async def get_camera_motions() -> Dict[str, Any]:
    """Get available camera motion presets for video generation."""
    
    motions = [
        {"id": "static", "name": "Static", "description": "No camera movement", "icon": "📷"},
        {"id": "pan_left", "name": "Pan Left", "description": "Camera pans left smoothly", "icon": "⬅️"},
        {"id": "pan_right", "name": "Pan Right", "description": "Camera pans right smoothly", "icon": "➡️"},
        {"id": "zoom_in", "name": "Zoom In", "description": "Camera zooms in gradually", "icon": "🔍"},
        {"id": "zoom_out", "name": "Zoom Out", "description": "Camera zooms out gradually", "icon": "🔎"},
        {"id": "dolly_forward", "name": "Dolly Forward", "description": "Camera moves forward", "icon": "⬆️"},
        {"id": "dolly_backward", "name": "Dolly Backward", "description": "Camera moves backward", "icon": "⬇️"},
        {"id": "orbit", "name": "Orbit", "description": "Camera orbits around subject", "icon": "🔄"},
        {"id": "crane_up", "name": "Crane Up", "description": "Camera cranes up vertically", "icon": "⤴️"},
        {"id": "crane_down", "name": "Crane Down", "description": "Camera cranes down vertically", "icon": "⤵️"}
    ]
    
    return {"motions": motions}


# ==================== GALLERY & HISTORY ====================

@router.get("/generations")
async def get_generations(type: Optional[str] = None, limit: int = 50) -> Dict[str, Any]:
    """Get generation history with filtering."""
    
    generations = load_list(GENERATIONS_STORE)
    
    if type:
        generations = [g for g in generations if g.get("type") == type]
    
    # Sort by creation date (newest first)
    generations.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "count": len(generations),
        "generations": generations[:limit]
    }


@router.get("/generation/{generation_id}")
async def get_generation(generation_id: str) -> Dict[str, Any]:
    """Get details of a specific generation."""
    
    generations = load_list(GENERATIONS_STORE)
    generation = next((g for g in generations if g["id"] == generation_id), None)
    
    if not generation:
        return {"error": "Generation not found"}
    
    return {"ok": True, "generation": generation}


@router.delete("/generation/{generation_id}")
async def delete_generation(generation_id: str) -> Dict[str, Any]:
    """Delete a generation and its files."""
    
    generations = load_list(GENERATIONS_STORE)
    generation = next((g for g in generations if g["id"] == generation_id), None)
    
    if not generation:
        return {"error": "Generation not found"}
    
    # Delete files
    if generation["type"] == "image":
        for img in generation.get("images", []):
            img_path = os.path.join(ROOT, "uploads", img["url"].lstrip("/files/"))
            if os.path.exists(img_path):
                os.remove(img_path)
    elif generation["type"] in ["video", "image_to_video"]:
        video_path = os.path.join(ROOT, "uploads", generation["url"].lstrip("/files/"))
        if os.path.exists(video_path):
            os.remove(video_path)
    
    # Remove from store
    generations = [g for g in generations if g["id"] != generation_id]
    save_list(GENERATIONS_STORE, generations)
    
    return {"ok": True, "message": "Generation deleted"}


# ==================== ADVANCED FEATURES ====================

@router.post("/upscale")
async def upscale_image(image_id: str, scale: int = 2) -> Dict[str, Any]:
    """Upscale image to higher resolution."""
    
    source_path = os.path.join(IMG_DIR, f"{image_id}.png")
    
    if not os.path.exists(source_path):
        return {"error": "Image not found"}
    
    try:
        from PIL import Image
        
        img = Image.open(source_path)
        new_size = (img.width * scale, img.height * scale)
        upscaled = img.resize(new_size, Image.Resampling.LANCZOS)
        
        upscaled_id = str(uuid.uuid4())
        out_path = os.path.join(IMG_DIR, f"{upscaled_id}.png")
        upscaled.save(out_path, quality=95)
        
        return {
            "ok": True,
            "original_id": image_id,
            "upscaled_id": upscaled_id,
            "url": f"/files/eduvi_images/{upscaled_id}.png",
            "original_size": f"{img.width}x{img.height}",
            "new_size": f"{new_size[0]}x{new_size[1]}"
        }
        
    except Exception as e:
        return {"error": f"Upscaling failed: {str(e)}"}


@router.post("/variations")
async def create_variations(image_id: str, num_variations: int = 3) -> Dict[str, Any]:
    """Create variations of an existing image."""
    
    # In production, use DALL-E variations API or Stable Diffusion img2img
    
    return {
        "ok": True,
        "note": "Image variations require DALL-E API or Stable Diffusion",
        "original_id": image_id,
        "num_variations": num_variations
    }


@router.get("/stats")
async def get_stats() -> Dict[str, Any]:
    """Get generation statistics and usage."""
    
    generations = load_list(GENERATIONS_STORE)
    
    total = len(generations)
    images = len([g for g in generations if g["type"] == "image"])
    videos = len([g for g in generations if g["type"] in ["video", "image_to_video"]])
    
    # Calculate total file sizes
    total_size = 0
    for gen in generations:
        if gen["type"] == "image":
            for img in gen.get("images", []):
                total_size += img.get("size", 0)
        else:
            total_size += gen.get("size", 0)
    
    return {
        "total_generations": total,
        "images_generated": images,
        "videos_generated": videos,
        "total_storage": total_size,
        "storage_formatted": f"{total_size / (1024*1024):.2f} MB"
    }
