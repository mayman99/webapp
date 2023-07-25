import csv
from transformers import AutoImageProcessor
from PIL import Image
import os
from transformers import AutoModelForObjectDetection
import numpy as np
import torch
import torchvision
import torchvision.transforms as transforms
from rotation_cnn import RotationCNN
from PIL import Image, ImageDraw

DEBUG = True

# id_mapping_path = "C:\\Users\\super\\ws\\sd_lora_segmap_topdown\\blenderproc_fork\\blenderproc\\resources\\front_3D\\3D_front_mapping_merged_new_complete.csv"
# with open(id_mapping_path, 'r', encoding="utf-8") as csv_file:
#     reader = csv.DictReader(csv_file)
#     for row in reader:
#         id2label[row["id"]] = row["name"]
# image = Image.open(os.path.join("C:\\Users\\super\\OneDrive\\Pictures\\", "00002-3422126125.png"))

def find_objects_locs(image_array, weights_path, image_size=512):
    """
    parameters:
    image: PIL image
    weights_path: path to the weights of the model
    image_size: size of the image
    returns:
    results: list of dictionaries
    each dictionary has the following format:
    {"location": [x, y], "label": category_id, "orientation": z_orientation}
    """
    image_processor = AutoImageProcessor.from_pretrained(weights_path)
    model = AutoModelForObjectDetection.from_pretrained(weights_path)
    
    # results is a dictionary with format:
    # [
    #     {"location": [x, y], "label": category_id, "orientation": z_orientation},
    # ]
    results = []
    cropped_images = []
    orientations = []
    image = Image.fromarray(image_array)
    with torch.no_grad():
        inputs = image_processor(images=image, return_tensors="pt")
        outputs = model(**inputs)
        target_sizes = torch.tensor([image.size[::-1]])
        model_results = image_processor.post_process_object_detection(outputs, threshold=0.50, target_sizes=target_sizes)[0]

    for score, label, box in zip(model_results["scores"], model_results["labels"], model_results["boxes"]):
        box = [round(i, 2) for i in box.tolist()]
        label = label.item()
        x, y, x2, y2 = tuple(box)
        # y = abs(y - image_size)
        # y2 = abs(y2 - image_size)
        # image_box = image_array[int(y):int(y2), int(x):int(x2)]

        # crop the image given the box, and pad the cropped image to be bigger
        x = 0 if x < 10 else x - 10
        y = 0 if y < 10 else y - 10
        x2 = image_size if x2 > image_size - 10 else x2 + 10
        y2 = image_size if y2 > image_size - 10 else y2 + 10

        cropped_image = image.crop((x, y, x2, y2))
        cropped_images.append(cropped_image)
        if DEBUG:
            draw = ImageDraw.Draw(image)
            draw.rectangle(box, outline="red")
            draw.text((x, y), model.config.id2label[label], fill="red")
            ori = find_single_ori(cropped_image)
            draw.text((x, y2), str(ori), fill="red")

        results.append({"location": [(x+x2)/2, (y+y2)/2], "label": label, "orientation": 0})
        print(
            f"{round(score.item(), 3)} at location {box}"
        )
    image.save("debug.png")
    orientations = find_object_ori(cropped_images, "./weights/cifar_net.pth")
    # update orientations in the results
    for i in range(len(results)):
        # rescale objects orientations
        results[i]["orientation"] = orientations[i]*10

    return results


def find_single_ori(image, weights_path:str="./weights/cifar_net.pth"):
    """
    takes a list of images as an input
    each image is a cropped image of the object
    returns the orientation of each object
    """
    net = RotationCNN()
    net.load_state_dict(torch.load(weights_path))
    transform = transforms.Compose([
        transforms.Resize((32, 32)),        # Resize the image to (224, 224) for most CNNs
        transforms.ToTensor(),                # Convert the PIL image to a PyTorch tensor (values between 0 and 1)
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],       # Mean and standard deviation for normalization (ImageNet statistics)
            std=[0.229, 0.224, 0.225]
        ),
    ])

    with torch.no_grad():
        # calculate outputs by running images through the network
        # image = Image.fromarray(image_array)
        tensor_image = transform(image).unsqueeze(0)
        outputs = net(tensor_image)
        _, predicted = torch.max(outputs.data, 1)

    return predicted.item()

def find_object_ori(images:list, weights_path:str="./weights/cifar_net.pth"):
    """
    takes a list of images as an input
    each image is a cropped image of the object
    returns the orientation of each object
    """
    net = RotationCNN()
    net.load_state_dict(torch.load(weights_path))
    transform = transforms.Compose([
        transforms.Resize((32, 32)),        # Resize the image to (224, 224) for most CNNs
        transforms.ToTensor(),                # Convert the PIL image to a PyTorch tensor (values between 0 and 1)
        transforms.Normalize(
            mean=[0.485, 0.456, 0.406],       # Mean and standard deviation for normalization (ImageNet statistics)
            std=[0.229, 0.224, 0.225]
        ),
    ])

    orientations = []
    for image in images:
        # since we're not training, we don't need to calculate the gradients for our outputs
        with torch.no_grad():
            # calculate outputs by running images through the network
            # image = Image.fromarray(image_array)
            tensor_image = transform(image).unsqueeze(0)
            outputs = net(tensor_image)
            _, predicted = torch.max(outputs.data, 1)
            orientations.append(predicted.item())

    return orientations
