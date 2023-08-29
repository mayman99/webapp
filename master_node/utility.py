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
from PIL import Image, ImageDraw
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
from object_detection import find_objects_locs
import typing

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

def get_model_path(category:str, base_online_url:str, online_models_list:list, models_info_data:dict={}, mmrotate:bool=True):
    """
    Given a cetegory return a 3d obj model path given the data in models_info_data
    """
    if mmrotate:
        for model_name in online_models_list:
            if model_name in category or category in model_name:
                return "models/" + model_name + '/raw_model_scaled_x50.glb'    
        return "models/nightstand" + '/raw_model_scaled_x50.glb'
    else:
        # blueprint js folders structure
        # TODO: don't hard code the paths
        for model_name in online_models_list:
            if model_name in category or category in model_name:
                return base_online_url + "/" + model_name + '/raw_model.glb'    
        return base_online_url + "/" + "nightstand" + '/raw_model.glb'

        # for model_id in models_info_data.keys():
        #     if "category" in models_info_data[model_id].keys() and type(models_info_data[model_id]["category"])==str:
        #         if category in models_info_data[model_id]["category"].lower():
        #             return os.path.join(front_3d_models, model_id, "normalized_model.obj")        
        #     elif "super-category" in models_info_data[model_id].keys() and type(models_info_data[model_id]["category"])==str:
        #         if category in models_info_data[model_id]["super-category"].lower():
        #             return os.path.join(front_3d_models, model_id, "normalized_model.obj")        
        # return None

async def mmrotate(url:str, images:typing.BinaryIO, DEBUG:bool=True):
    """
    Send the image in a request to the mmrotate API and return objects locations and orientations
    params:
    url: the url of the mmrotate API
    image: the image to send: PIL image
    returns:
    results: list of dictionaries
    results is in format:
    {"path": path,"location": [x, y], "label": category_id, "orientation": z_orientation}
    """
    id2label = {}
    id_mapping_path = "C:\\Users\\super\\ws\\sd_lora_segmap_topdown\\blenderproc_fork\\blenderproc\\resources\\front_3D\\3D_front_mapping_merged_new_complete.csv"
    models_dir = "./../models"
    # read avaliable models from the models dir
    models_list = os.listdir(models_dir)
    with open(id_mapping_path, 'r', encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            id2label[row["id"]] = row["name"]
    base_online_url = 'https://raw.githubusercontent.com/mayman99/webapp/main/models'

    res = requests.post(url, files={"data": images})

    res = res.json()
    print('mmrotate response: ', res)
    results = []

    for single_res in res:
        result = {}
        result["path"] = get_model_path(single_res["class_name"].replace('-', ' '), base_online_url, models_list, True)
        result["location"] = [single_res["bbox"][0], single_res["bbox"][1]]
        result["orientation"] = single_res["bbox"][-1]
        results.append(result)

    if DEBUG:
        # convert image from BufferedReader to PIL image
        im = Image.open("./15.png")
        draw = ImageDraw.Draw(im)
        for r in res:
            draw.rectangle([r["bbox"][0], r["bbox"][1], r["bbox"][2], r["bbox"][3]], outline="red")
            draw.text((r["bbox"][0], r["bbox"][1]), r["class_name"].replace('-', ' '), fill="red")
        im.save("debug.png")

    if len(results) == 0:
        return {"status": "fail", "result": results}

    print(results)
    return {"status": "success", "result": results}

async def image_to_json_dl(image):
    # TODO: don't hard code the paths
    id_mapping_path = "C:\\Users\\super\\ws\\sd_lora_segmap_topdown\\blenderproc_fork\\blenderproc\\resources\\front_3D\\3D_front_mapping_merged_new_complete.csv"
    weights_path = "./weights/yolos_finetuned_cones_scaled_bedroom_obj_detection"
    base_online_url = 'https://raw.githubusercontent.com/mayman99/webapp/main/models'
    models_dir = "./../models"

    # read avaliable models from the models dir
    models_list = os.listdir(models_dir)

    # results is a dictionary with format:
    # [
    #     {"location": [x, y], "label": category_id, "orientation": z_orientation},
    # ]
    results = {}
    id2label = {}
    image = np.array(image)
    with open(id_mapping_path, 'r', encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            id2label[row["id"]] = row["name"]
    # TODO [EPIC]: integrate ori into object detection network
    # TODO: it gets the poses, not just locations
    # TODO: encode oris as one hot encoded, network might not learn well with integer values
    results = find_objects_locs(image, weights_path)
    # for ecah result, add the model path using the result label and the id2label dictionary
    for result in results:
        result["path"] = get_model_path(id2label[str(result["label"])], base_online_url, models_list)

    if len(results) == 0:
        return {"status": "fail", "result": results}

    print(results)
    return {"status": "success", "result": results}


async def image_to_json_classic(image):

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

    def get_model_info():   
        id_to_cat = {}
        cat_to_id = {}
        with open(front_3d_csv_path, 'r', encoding="utf-8") as csv_file:
            reader = csv.DictReader(csv_file)
            for row in reader:
                cat_to_id[row["name"]] = int(row["id"])
                id_to_cat[row["id"]] = row["name"]
        
        return cat_to_id, id_to_cat

    image = np.array(image)
    cv2.imwrite("./../outputs/image.jpg", image)
    _, id_to_cat  = get_model_info()
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
    # wcss = []
    # for i in range(1, 20):
    #     kmeans = KMeans(n_clusters=i, n_init=1)
    #     kmeans.fit(img_arr_reshape)
    #     wcss.append(kmeans.inertia_)

    # clusters_count = clusters_num(wcss)
    # kmeans = KMeans(n_clusters=clusters_count)

    clusters_count = 5
    kmeans = KMeans(n_clusters=clusters_count)
    kmeans.fit(img_arr_reshape)
    labels = kmeans.predict(img_arr_reshape)
    labels_reshape = np.reshape(labels, (height, width))

    results = []

    for obj_ in range(clusters_count):
        location_category = {}
        mask = labels_reshape == obj_
        count = np.count_nonzero(mask == 1)
        if count < 5000:
            continue

        obj_id = find_object_id(mask, img_arr, points)
        obj_cat = id_to_cat[str(obj_id)].lower()
        # Output walls in a seprate file     
        if 'wall' in obj_cat:
            np.save(os.path.join(output_json, obj_cat + img_name), labels_reshape == obj_)
            continue

        if 'void' in obj_cat:
            continue

        # Write the objects in renderable_objects to a json file
        locs = find_location(mask, img_arr)
        # if len(locs>1):
        #     #TODO remove the first centroid because it is empty most of the time
        #     location_category[get_model_path(obj_cat, models_info_data)] = locs[1:].tolist()

        #     #TODO remove the first centroid because it is empty most of the time
        print(obj_cat, locs)
        location_category["path"] = get_model_path(obj_cat, models_info_data, online=True)
        location_category["locations"] = locs.tolist()

        results.append(location_category)

    print(results)

    return {"status": "success", "result": results}

def change_values_inside_polygon(np_array, points:dict, floor_color: list=[163, 195, 14], void_color: list=[60, 37, 97], walls_color: list=[245, 52, 50], doors_color: list=[209, 89, 233], windows_color: list=[236, 239, 159]):
    """
    Change the values inside a polygon to a given value and the values outside to another given value.
    :param np_array: The numpy array to change the values of.
    :param points: The points of the polygon.
    :param floor_color: The value to change the values inside the polygon to.
    :param void_color: The value to change the values outside the polygon to.
    :return: The numpy array with the values changed.
    """
    def change_rectangle_values(array, p1, p4, new_value):
        # Change the values inside the rectangle defined by (x1, y1) and (x2, y2) to the new_value
        x1, y1 = p1
        x2, y2 = p4
        array[x1:x2+1, y1:y2+1] = new_value
        return array

    def find_parallel_points(point1, point2, buffer=5):
        x1 = int(point1[0])
        y1 = int(point1[1])
        x2 = int(point2[0])
        y2 = int(point2[1])

        # # Calculate the slope of the given line
        slope = (y2 - y1) / (x2 - x1)

        # # Determine whether to add or subtract 2 units from the y-coordinate
        # if slope >= 0:
        #     y_offset = buffer
        # else:
        #     y_offset = -buffer

        # # Create two new points parallel to the given line, two units apart
        # new_point1 = (x1, y1 + y_offset)
        # new_point2 = (x2, y2 + y_offset)

        perpendicular_slope = -1 / slope

        # Determine whether to add or subtract 2 units from the y-coordinate
        if perpendicular_slope >= 0:
            y_offset = -buffer
        else:
            y_offset = buffer

        new_point1 = (x1, y1 - y_offset)
        new_point2 = (x2, y2 - y_offset)
        new_point3 = (x1, y1 + y_offset)
        new_point4 = (x2, y2 + y_offset)

        return new_point1, new_point2, new_point3, new_point4

    mid_points = []
    door_points = []
    window_points = []
    wall_points = []
    for i in range(0, len(points)):
        # if points[i]['type'] == 'wall':
        mid_points.append([points[i]['x1'], points[i]['y1']])
        mid_points.append([points[i]['x2'], points[i]['y2']])
        if points[i]['type'] == 'door':
            door_points.append([int(points[i]['x1']), int(points[i]['y1'])])
            door_points.append([int(points[i]['x2']), int(points[i]['y2'])])
        elif points[i]['type'] == 'window':
            window_points.append([int(points[i]['x1']), int(points[i]['y1'])])
            window_points.append([int(points[i]['x2']), int(points[i]['y2'])])

    # Calculate the inner and outer polygons
    inside_points, outside_points = calculate_inner_outer_polygons(mid_points, 10)

    # Create a path from the polygon points
    path = mpl_path.Path(inside_points)
    
    # Get the shape of the input np_array
    rows, cols, _ = np_array.shape
    
    # Create a grid of coordinates
    x_grid, y_grid = np.meshgrid(np.arange(cols), np.arange(rows))
    
    # Flatten the grid coordinates
    points = np.vstack((x_grid.flatten(), y_grid.flatten())).T
    
    # Check if each point is inside the polygon
    floor_mask = path.contains_points(points).reshape(rows, cols)
    
    # Change values inside the polygon to x and outside to y
    np_array[floor_mask] = floor_color

    # Create a path from the polygon points
    path = mpl_path.Path(outside_points)
    
    # Get the shape of the input np_array
    rows, cols, _ = np_array.shape
    
    # Create a grid of coordinates
    x_grid, y_grid = np.meshgrid(np.arange(cols), np.arange(rows))
    
    # Flatten the grid coordinates
    points = np.vstack((x_grid.flatten(), y_grid.flatten())).T
    
    # Check if each point is inside the polygon
    void_mask = path.contains_points(points).reshape(rows, cols)
    
    np_array[~void_mask] = void_color

    np_array[void_mask==~floor_mask] = walls_color

    # color points inside doors and windows
    # Calculate the inner and outer polygons
    if (len(door_points)> 0):
        # p1, p2, p3, p4 = find_parallel_points(door_points[0], door_points[1], 20)
        
        # increase the thickness of the door using the two points used to define the door
        if door_points[0][0]-door_points[1][0] > door_points[0][1]-door_points[1][1]:
            # the door is more horizontal than vertical
            # define the four points that will be used to increase the thickness of the door
            p1 = (door_points[0][0], door_points[0][1]-20)
            p2 = (door_points[0][0], door_points[0][1]+20)
            p3 = (door_points[1][0], door_points[1][1]-20)
            p4 = (door_points[1][0], door_points[1][1]+20)
            np_array = change_rectangle_values(np_array, p1, p4, doors_color)
        else:
            # the door is more vertical than horizontal
            # define the four points that will be used to increase the thickness of the door
            p1 = (door_points[0][0]-20, door_points[0][1])
            p2 = (door_points[0][0]+20, door_points[0][1])
            p3 = (door_points[1][0]-20, door_points[1][1])
            p4 = (door_points[1][0]+20, door_points[1][1])
            np_array = change_rectangle_values(np_array, p1, p4, doors_color)

        # Create a path from the polygon points
    #     path = mpl_path.Path(find_parallel_points(door_points[0], door_points[1], 20))
        
    #     # Get the shape of the input np_array
    #     rows, cols, _ = np_array.shape
        
    #     # Create a grid of coordinates
    #     x_grid, y_grid = np.meshgrid(np.arange(cols), np.arange(rows))
        
    #     # Flatten the grid coordinates
    #     points = np.vstack((x_grid.flatten(), y_grid.flatten())).T
        
    #     # Check if each point is inside the polygon
    #     door_mask = path.contains_points(points).reshape(rows, cols)
        
    #     # Change values inside the polygon to x and outside to y
    #     np_array[door_mask] = doors_color



    # if (len(window_points)> 0):

    #     # Create a path from the polygon points
    #     path = mpl_path.Path(find_parallel_points(window_points[0], window_points[1], 20))
        
    #     # Get the shape of the input np_array
    #     rows, cols, _ = np_array.shape
        
    #     # Create a grid of coordinates
    #     x_grid, y_grid = np.meshgrid(np.arange(cols), np.arange(rows))
        
    #     # Flatten the grid coordinates
    #     points = np.vstack((x_grid.flatten(), y_grid.flatten())).T
        
    #     # Check if each point is inside the polygon
    #     window_mask = path.contains_points(points).reshape(rows, cols)
        
    #     # Change values inside the polygon to x and outside to y
    #     np_array[window_mask] = windows_color 

    return np_array
