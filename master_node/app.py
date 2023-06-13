import asyncio
import requests
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
from PIL import Image

import os
import cv2
from matplotlib import pyplot as plt
import numpy as np
from sklearn.cluster import KMeans
import numpy as np
import matplotlib.pyplot as plt
import csv

import json
import math

from utility import image_to_json
from utility import change_values_inside_polygon

app = FastAPI()
# app.mount("/static", StaticFiles(directory="static"), name="static")
# templates = Jinja2Templates(directory="templates")
SD_API_URL = "http://127.0.0.1:7860/sdapi/v1/img2img"  # Replace with the actual API endpoint URL
SD_API_URL_TXT2IMG = "http://127.0.0.1:7860/sdapi/v1/txt2img"  # Replace with the actual API endpoint URL

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://localhost:3000",
    "https://github.com/"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

@app.post("/upload-image/")
async def upload_image(image: dict):
    # Start the processing script asynchronously
    image_task = asyncio.create_task(process_image(image))
    image_result = await asyncio.gather(image_task)

    print(image_result)

    encoded_image = image_result[0]["result"]

    json_task = asyncio.create_task(image_to_json(encoded_image))
    json_result = await asyncio.gather(json_task)

    print(json_result)

    return {
        "status": "Processing started",
        "result": json_result
    }

@app.post("/upload-points/")
async def upload_points(points: dict):
    # Start the processing script asynchronously
    image_task = asyncio.create_task(process_points(points))
    image_result = await asyncio.gather(image_task)

    print(image_result)

    # encoded_image = image_result[0]["result"]

    # json_task = asyncio.create_task(image_to_json(encoded_image))
    # json_result = await asyncio.gather(json_task)

    # print(json_result)

    return {
        "status": "Processing started",
        # "result": image_result
    }

@app.websocket("/progress/{image_name}")
async def websocket_endpoint(websocket: WebSocket, image_name: str):
    await websocket.accept()

    # Process the image and send progress updates
    progress = await process_image(image_name, websocket)
    await websocket.send_text(progress)

    # Close the websocket connection
    await websocket.close()

async def process_points(response: str, fake_backend: bool = True):
    # Read Image in RGB order
    points = response.get('data')
    empty_drawing_array = np.zeros((512, 512, 3), dtype=np.uint8)
    mid_points = []
    for i in range(0, len(points)):
        mid_points.append([points[i]['x1'], points[i]['y1']])
        mid_points.append([points[i]['x1'], points[i]['y2']])

    print(mid_points)
    drawing_array = change_values_inside_polygon(empty_drawing_array, mid_points, [0, 0, 0], [255, 255, 255])
    img = Image.fromarray(drawing_array, 'RGB')
    img.save('./../outputs/output.png')

    # Return a completion message
    return {"status": "Processing completed", "result": img}

async def process_image(image: str, fake_backend: bool = True):
    # Read Image in RGB order
    encoded_drawing = image.get('data')
    encoded_drawing_array = np.array(Image.open(io.BytesIO(base64.b64decode(encoded_drawing.split(",", 1)[0]))))
    encoded_drawing_colored_array = change_values_inside_polygon(encoded_drawing_array, image.get('polygon'), image.get('color'), image.get('color2'))

    if fake_backend:
        return {"status": "Processing completed", "result": encoded_image}
    else:
        # A1111 payload
        payload = {
            "init_images": [encoded_image],
            "prompt": "segmentation map, orthographic view, furnished bedroom, single bed, nightstand, nightstand, wardrobe, shelf <lora:bedrooms_lhs_27_4000_steps:1>",
            "cfg_scale": 7.5,
            "width": 512,
            "height": 512,
            # "alwayson_scripts": {
                # "controlnet":{
                #     "args":[
                #         {
                #         "input_image": encoded_image,
                #         "module":"mlsd",
                #         "model":"control_v11p_sd15_mlsd [aca30ff0]",
                #         "weight":1
                #         }
                #     ]
                # }
            # }
        }
        # Make a POST request to the stable diffusion API
        response = requests.post(SD_API_URL, json=payload)

        # Read results
        r = response.json()
        result = r['images'][0]
        image = Image.open(io.BytesIO(base64.b64decode(result.split(",", 1)[0])))
        image.save('./../outputs/output.png')
    
        if response.status_code == 200:
            # Processing successful, obtain the result and send progress updates
            result = response.content  # Assuming the API returns the processed image
            # Process the result and send progress updates, e.g., in chunks
            # for chunk in process_result_chunks(result):
            #     await websocket.send_text(chunk)
        else:
            # Processing failed, send an error message
            await websocket.send_text("Processing failed")

        # Return a completion message
        return {"status": "Processing completed", "result": image}

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
