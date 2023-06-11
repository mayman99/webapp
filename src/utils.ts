import { RoomKeySegment } from "./DrawRoom";

interface Point {
    x: number;
    y: number;
  }
  
export function img2imgReqBody(initImages: string, mask: string, prompt: string) {
    return JSON.stringify({
        "init_images": [initImages],
        "resize_mode": 0,
        "denoising_strength": 0.75,
        "mask": mask,
        "mask_blur": 4,
        "inpainting_fill": 1,
        "inpaint_full_res": "True",
        "inpaint_full_res_padding": 0,
        "inpainting_mask_invert": 0,
        "prompt": prompt,
        "styles": [],
        "seed": -1,
        "subseed": -1,
        "subseed_strength": 0,
        "seed_resize_from_h": -1,
        "seed_resize_from_w": -1,
        "batch_size": 1,
        "n_iter": 1,
        "steps": 40,
        "cfg_scale": 7,
        "width": 512,
        "height": 512,
        "restore_faces": "False",
        "tiling": "False",
        "negative_prompt": "",
        "eta": 0,
        "s_churn": 0,
        "s_tmax": 0,
        "s_tmin": 0,
        "s_noise": 1,
        "override_settings": {},
        "sampler_index": "Euler a",
        "include_init_images": "True"
    });
}

// export function replaceColor(ctx, fromColor, toColor) {
//     const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
//     const data = imageData.data;
//     const len = data.length;

//     // Iterate over each pixel
//     for (let i = 0; i < len; i += 4) {
//         const r = data[i];
//         const g = data[i + 1];
//         const b = data[i + 2];

//         // Check if the pixel's color matches the color to be replaced
//         if (r === fromColor[0] && g === fromColor[1] && b === fromColor[2]) {
//             // Replace the color
//             data[i] = toColor[0];
//             data[i + 1] = toColor[1];
//             data[i + 2] = toColor[2];
//         }
//     }

//     // Put the modified image data back onto the canvas
//     ctx.putImageData(imageData, 0, 0);
// }

export function colorFloor(img, lines, floorColor) {
    
    const data = img.data;
    let maxX = 0;
    let maxY = 512;
    let minX =512;
    let minY = 0;
    for (let i = 0, j = lines.length - 1; i < lines.length; j = i++) {
        const line = lines[i];
        if	(line.x1 > maxX) {
            maxX = line.x1;
        }
        if	(line.x1 < minX) {
            minX = line.x1;
        }
        if	(line.y1 > maxY) {
            maxY = line.y1;
        }
        if	(line.y1 < minY) {
            minY = line.y1;
        }
        if	(line.x2 > maxX) {
            maxX = line.x2;
        }
        if	(line.x2 < minX) {
            minX = line.x2;
        }
        if	(line.y2 > maxY) {
            maxY = line.y2;
        }
        if	(line.y2 < minY) {
            minY = line.y2;
        }
    }  
    // Iterate over each pixel
    for (let i = 0; i < data.length; i += 4) {
        // const r = data[i];
        // const g = data[i + 1];
        // const b = data[i + 2];
        
        // // Check if the pixel's color matches the color to be replaced
        // if (r === fromColor[0] && g === fromColor[1] && b === fromColor[2]) {
            //   // Replace the color
            //   data[i] = toColor[0];
            //   data[i + 1] = toColor[1];
            //   data[i + 2] = toColor[2];
            // }
        const p : Point = {x: Math.floor(i / 2048), y: i % 2048};
        if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
            // Definitely not within the polygon!
            data[i] = 0;
            data[i + 1] = 240;
            data[i + 2] = 0;
        }
        

        // if (isPointInsideLines({x: Math.floor(i / 2048), y: i % 2048}, lines)) {
        //     data[i] = 236;
        //     data[i + 1] = 240;
        //     data[i + 2] = 216;
        //     console.log(Math.floor(i / 2048), i%2048);
        // }
    }

    return img;
    // Put the modified image data back onto the canvas
    // ctx.putImageData(imageData, 0, 0);
}

function isPointInsideLines(point: Point, lines: RoomKeySegment[]): boolean {
    let inside = false;
    for (let i = 0, j = lines.length - 1; i < lines.length; j = i++) {
      const line = lines[i];
      const intersect =
        line.x1 > point.y !== line.y2 > point.y &&
        point.x <
          ((line.y2 - line.x1) *
            (point.y - line.y1)) /
            (line.y2 - line.y1) +
            line.x1;
      if (intersect) {
        inside = !inside;
      }
    }
    return inside;
  }

export function hexToRGB(hex) {
    // Remove the '#' character if present
    if (hex.charAt(0) === '#') {
        hex = hex.slice(1);
    }

    // Separate the components
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);

    // Return the RGB values
    return [red, green, blue];
}

export function RGBtoHex(rgb: Array<number>) {
    // Remove the '#' character if present
    const hex = '#' + rgb.map(x => {
        const hex = x.toString(16)
        return hex.length === 1 ? '0' + hex : hex
    }).join('')
    return hex
}
