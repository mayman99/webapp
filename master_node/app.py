import asyncio
import requests
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
from PIL import Image

from matplotlib import pyplot as plt
import numpy as np
import numpy as np
from io import BytesIO

from utility import image_to_json_classic, image_to_json_dl, mmrotate, color_image_for_sd_lora
from utility import change_values_inside_polygon

app = FastAPI()

SD_API_URL = "https://6ae3-35-222-47-194.ngrok-free.app/sdapi/v1/img2img"  # Replace with the actual API endpoint URL
SD_API_URL_TXT2IMG = "https://fa76-34-87-162-144.ngrok-free.app/sdapi/v1/txt2img"  # Replace with the actual API endpoint URL
MMROTATE_API_URL = "http://192.168.1.53:8080/predictions/epoch_4"  # Replace with the actual API endpoint URL

base_prompt = "<lora:pytorch_model_converted:1> segmentation map, orthographic view, with camera scale of 5.0 furnished apartment, Bedroom, bed, wardrobe, nightstand, table"

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:1234",
    "https://github.com/",
    "http://127.0.0.1:7860/sdapi/v1/img2img",
    "http://127.0.0.1:7860/sdapi/v1/txt2img"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/upload-points/")
async def upload_points(points: dict):
    fake_ai_backend = True
    # "mmrotate" or "yolo + a valilla cnn"
    second_stage = "mmrotate"

    # Start the processing script asynchronously
    image_task = asyncio.create_task(process_points(points, fake_ai_backend, batch_size=4))
    results = await asyncio.gather(image_task)

    image_result = results[0]["results"]
    original_images = results[0]["original_images"]
    # print('image_result', image_result)

    async_tasks = []
    if second_stage == "mmrotate":
        for idx, image in enumerate(image_result):
            async_tasks.append(asyncio.create_task(mmrotate(MMROTATE_API_URL, image, original_images[idx], idx)))

        json_result = await asyncio.gather(*async_tasks)
    else:
        for image in image_result:
            async_tasks.append(asyncio.create_task(image_to_json_dl(image)))

    print('json_result', json_result)

    return {
        "status": "Processing Finished",
        "result": json_result
    }

async def process_points(response: str, fake_backend: bool = False, batch_size: int = 2):
    """
    process points that are sent from the frontend
    The points are in the format of:
    {
        "data": [
            x1:,
            y1:,
            x2:,
            y2:,
            type: [wall, window, door, ...]],
            ...
        ]
    }
    """
    def pil_to_base64(pil_image):
        with BytesIO() as stream:
            pil_image.save(stream, "PNG", pnginfo=None)
            base64_str = str(base64.b64encode(stream.getvalue()), "utf-8")
            return "data:image/png;base64," + base64_str

    if fake_backend:
        # Read Image in RGB order
        points = response.get('data')
        empty_drawing_array = np.zeros((512, 512, 3), dtype=np.uint8)
        img = color_image_for_sd_lora(empty_drawing_array, points)
        img1 = open("./596.png", 'rb')
        imgs = [img1]
        pil_images = [img]
        # for img in imgs:
        #     pil_images.append(img)

        return {"status": "Processing completed", "results": imgs, "original_images": pil_images}
    else:
        # Read Image in RGB order
        points = response.get('data')
        empty_drawing_array = np.zeros((512, 512, 3), dtype=np.uint8)
        img = color_image_for_sd_lora(empty_drawing_array, points)
        img.save('init.png')

        # image_bytes = img.tobytes()
        # base64_data = 'data:image/png;base64,'
        # base64_data += base64.b64encode(image_bytes).decode("utf-8")
        # A1111 payload
        payload = {
            "init_images": [pil_to_base64(img)],
            "prompt": base_prompt,
            "cfg_scale": 7,
            "steps":30,
            "width": 512,
            "height": 512,
            "batch_size": batch_size,
            "denoising_strength": 0.8,
            "sampler_index": "Euler",
            "alwayson_scripts": {
                "controlnet":{
                    "args":[
                        {
                        "input_image": pil_to_base64(img),
                        "module":"canny",
                        "model":"control_v11p_sd15_canny [d14c016b]",
                        "weight":1
                        }
                    ]
                }
            }
        }
        # Make a POST request to the stable diffusion API
        response = requests.post(SD_API_URL, json=payload)
        # Read results
        results = response.json()['images']
        images = []
        buffered_readers = []
        for index, result in enumerate(results):
            if index == len(results) - 1:
                continue
            image = Image.open(io.BytesIO(base64.b64decode(result.split(",", 1)[0])))
            bytes_io = io.BytesIO(base64.b64decode(result.split(",", 1)[0]))
            buffered_reader = io.BufferedReader(bytes_io)
            buffered_readers.append(buffered_reader)
            images.append(image)
            image.save('./results/output'+str(index)+'.png')
    
        if response.status_code == 200:
            # Processing successful, obtain the result and send progress updates
            result = response.content  # Assuming the API returns the processed image
            # Process the result and send progress updates, e.g., in chunks
            # for chunk in process_result_chunks(result):
            #     await websocket.send_text(chunk)

        # Return a completion message
        return {"status": "Step one completed", "results": buffered_readers, "original_images": images}

def process_result_chunks(result):
    # Split the result into chunks for progress updates
    chunk_size = 1024  # Set the desired chunk size
    for i in range(0, len(result), chunk_size):
        yield result[i:i+chunk_size]

# @app.get("/")
# async def index():
#     return templates.TemplateResponse("index.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="localhost", port=8000, reload=True)
