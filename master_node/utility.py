import os
import cv2
import numpy as np
import matplotlib.path as mpl_path
import asyncio
import requests
from fastapi import FastAPI, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
from PIL import Image
import os
import cv2
import numpy as np
from sklearn.cluster import KMeans
import numpy as np
import csv
import json
import math
from shapely.geometry import Polygon
from shapely.ops import unary_union

def calculate_inner_outer_polygons(polygon, buffer_distance):
    # Create a Shapely polygon object
    shapely_polygon = Polygon(polygon)
    
    # Dilate the polygon to get the outer polygon
    outer_polygon = shapely_polygon.buffer(buffer_distance).exterior.coords
    
    # Erode the polygon to get the inner polygon
    inner_polygon = shapely_polygon.buffer(-buffer_distance).exterior.coords
    
    # Convert the coordinates back to a list
    outer_polygon = list(outer_polygon)
    inner_polygon = list(inner_polygon)
    
    return inner_polygon, outer_polygon

async def image_to_json(image_base64: str):

    # paths
    front_3d_csv_path = 'C:\\Users\\super\\ws\\sd_lora_segmap_topdown\\blenderproc_fork\\blenderproc\\resources\\front_3D\\3D_front_mapping_merged_new_complete.csv'
    point_path = 'C:\\Users\\super\\ws\\sd_lora_segmap_topdown\\blenderproc_fork\\blenderproc\\resources\\front_3D\\points.npy'
    img_name = "image_from_master_node"
    models_info_path = 'C:\\Users\\super\\ws\\data\\front_3d\\3D-FUTURE-model\\model_info.json'
    front_3d_models = 'C:\\Users\\super\\ws\\data\\front_3d\\3D-FUTURE-model'
    output_json = "./../outputs/"

    # hyper params
    errotion_iterations = 2

    # load models info
    models_info_data = {}
    with open(os.path.join(models_info_path), "r", encoding="utf-8") as models_json:
        models_data = json.load(models_json)
        for item in models_data:
            models_info_data[item["model_id"]] = item


    def base64_to_cv2(base64_string):
        # Decode the base64 string to bytes
        image_bytes = base64.b64decode(base64_string)

        # Convert the bytes to a NumPy array
        np_array = np.frombuffer(image_bytes, np.uint8)

        # Decode the NumPy array to an OpenCV image
        image_cv2 = cv2.imdecode(np_array, cv2.IMREAD_COLOR)

        return image_cv2

    def sum_pixels_cluster(img_array, binary_image_of_cluster):
        x, y = np.where(binary_image_of_cluster==1)
        sum_ = [0, 0, 0]
        for x_idx, _ in enumerate(x):
            sum_+= img_array[x[x_idx], y[x_idx]]
        return sum_

    def closest_point(point, points_list):
        """
        closest color
        """
        distances = []
        for p in points_list:
            distance = math.sqrt((p[0] - point[0])**2 + (p[1] - point[1])**2 + (p[2] - point[2])**2)
            distances.append(distance)
        min_distance_idx = distances.index(min(distances))
        return min_distance_idx

    def find_object_id(binary_image_of_cluster, img_array, color_ids_mapping):
        """
        id of object repersented by cluster (could be converted later to category)
        """
        # find the average value of those pixels colors in the original image    
        object_pixels_values = sum_pixels_cluster(img_array, binary_image_of_cluster)
        avg_color = object_pixels_values/np.sum(binary_image_of_cluster)
        obj_id = closest_point(avg_color, color_ids_mapping)
        return obj_id

    def find_location(binary_image_of_cluster, img_arr):
        # in case of more than one object is detected
        mask = np.array(binary_image_of_cluster, dtype=np.uint8)
        # Define structuring element
        kernel = np.ones((3,3), np.uint8)  # 3x3 square
        # Apply erosion operation
        eroded_image = cv2.erode(mask, kernel, iterations=6)
        num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(eroded_image)
        # print("num_labels: ", num_labels)
        # print(centroids)
        return centroids

    def clusters_num(wcss: list):
        for idx, v in enumerate(wcss):
            if v < 2:
                return idx
        return len(wcss)

    def get_model_path(category:str, models_info_data:dict, online:bool=True):
        """
        Given a cetegory return a 3d obj model path given the data in models_info_data
        """
        if online:
            base_online_url = 'https://raw.githubusercontent.com/mayman99/webapp/main/models'
            online_models_list = ["bed", "wardrobe", "nightstand"]
            for model_name in online_models_list:
                if "category" in model_name:
                    return base_online_url + model_name + 'raw_model.glb'    
            return None
        else:
            for model_id in models_info_data.keys():
                if "category" in models_info_data[model_id].keys() and type(models_info_data[model_id]["category"])==str:
                    if category in models_info_data[model_id]["category"].lower():
                        return os.path.join(front_3d_models, model_id, "normalized_model.obj")        
                elif "super-category" in models_info_data[model_id].keys() and type(models_info_data[model_id]["category"])==str:
                    if category in models_info_data[model_id]["super-category"].lower():
                        return os.path.join(front_3d_models, model_id, "normalized_model.obj")        
            return None

    def get_model_info():   
        id_to_cat = {}
        cat_to_id = {}
        with open(front_3d_csv_path, 'r', encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                cat_to_id[row["name"]] = int(row["id"])
                id_to_cat[row["id"]] = row["name"]
        
        return cat_to_id, id_to_cat

    image = base64_to_cv2(image_base64)
    # Load meta data
    cat_to_id, id_to_cat  = get_model_info()
    points = np.load(point_path)

    # Erroding
    kernel = np.ones((3,3), np.uint8)  # 3x3 square
    image = cv2.erode(image, kernel, iterations=errotion_iterations)

    img_arr = np.array(image)
    if len(img_arr.shape)>2:
        img_arr = img_arr[: ,:, :3]

    # Reshape the image
    height, width, _ = img_arr.shape
    img_arr_reshape = np.reshape(img_arr, (height * width, 3))

    # Use elbow method to determine optimal number of clusters
    wcss = []
    for i in range(1, 20):
        kmeans = KMeans(n_clusters=i, n_init=1)
        kmeans.fit(img_arr_reshape)
        wcss.append(kmeans.inertia_)

    clusters_count = clusters_num(wcss)
    kmeans = KMeans(n_clusters=clusters_count)
    kmeans.fit(img_arr_reshape)
    labels = kmeans.predict(img_arr_reshape)
    labels_reshape = np.reshape(labels, (height, width))

    location_category = {}
    params = cv2.SimpleBlobDetector_Params()
    detector = cv2.SimpleBlobDetector_create(params)

    for obj_ in range(clusters_count):
        obj_id = find_object_id(labels_reshape == obj_, img_arr, points)
        obj_cat = id_to_cat[str(obj_id)].lower()
        print(obj_cat)
        # Output walls in a seprate file     
        if 'wall' in obj_cat:
            np.save(os.path.join(output_json, obj_cat + img_name), labels_reshape == obj_)
            continue

        if 'void' in obj_cat:
            continue

        # Write the objects in renderable_objects to a json file
        locs = find_location(labels_reshape == obj_, img_arr)
        if len(locs>1):
            #TODO remove the first centroid because it is empty most of the time
            location_category[get_model_path(obj_cat, models_info_data)] = locs[1:].tolist()

    # with open(os.path.join(output_json, img_name +'.json'), "w") as f:    
    #     json.dump(location_category, f)

    return {"status": "success", "result": location_category}

def change_values_inside_polygon(np_array, points:list, floor_color: list, void_color: list):
    """
    Change the values inside a polygon to a given value and the values outside to another given value.
    :param np_array: The numpy array to change the values of.
    :param points: The points of the polygon.
    :param floor_color: The value to change the values inside the polygon to.
    :param void_color: The value to change the values outside the polygon to.
    :return: The numpy array with the values changed.
    """
    # Calculate the inner and outer polygons
    inside_points, outside_points = calculate_inner_outer_polygons(points, 6)

    # Create a path from the polygon points
    path = mpl_path.Path(inside_points)
    
    # Get the shape of the input np_array
    rows, cols, _ = np_array.shape
    
    # Create a grid of coordinates
    x_grid, y_grid = np.meshgrid(np.arange(cols), np.arange(rows))
    
    # Flatten the grid coordinates
    points = np.vstack((x_grid.flatten(), y_grid.flatten())).T
    
    # Check if each point is inside the polygon
    mask = path.contains_points(points).reshape(rows, cols)
    
    # Change values inside the polygon to x and outside to y
    np_array[mask] = floor_color

        # Create a path from the polygon points
    path = mpl_path.Path(outside_points)
    
    # Get the shape of the input np_array
    rows, cols, _ = np_array.shape
    
    # Create a grid of coordinates
    x_grid, y_grid = np.meshgrid(np.arange(cols), np.arange(rows))
    
    # Flatten the grid coordinates
    points = np.vstack((x_grid.flatten(), y_grid.flatten())).T
    
    # Check if each point is inside the polygon
    mask = path.contains_points(points).reshape(rows, cols)
    
    np_array[~mask] = void_color

    return np_array
