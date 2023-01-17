import React from 'react';
import ImageUploading from 'react-images-uploading';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { Button } from '@mui/material';
import { Box }  from '@mui/material';
import { Fab } from '@mui/material';
import { IceSkatingSharp } from '@mui/icons-material';
import {TextField} from '@mui/material';
import Input from '@mui/material';


function UploadImage() {
  const [images, setImages] = React.useState([]);
  const [text, setText] = React.useState('');
  const maxNumber = 1;

  function detectImageRegions(url:string) {
    // change to an async function later
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'React POST Request Example' })
    };
    fetch('http://172.17.0.2:8080/detect', requestOptions)
        // .then(response => response.json())
        // .then(data => console.log(data));
  }

  function text2ImgPost() {
    // change to an async function later
    const requestOptions = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'mode': 'no-cors'  },
        body: JSON.stringify({
            "enable_hr": "False",
            "denoising_strength": 0,
            "firstphase_width": 0,
            "firstphase_height": 0,
            "prompt": "dogs and cats may break my bones",
            "styles": [],
            "seed": -1,
            "subseed": -1,
            "subseed_strength": 0,
            "seed_resize_from_h": -1,
            "seed_resize_from_w": -1,
            "batch_size": 1,
            "n_iter": 1,
            "steps": 3,
            "cfg_scale": 7,
            "width": 64,
            "height": 64,
            "restore_faces": "False",
            "tiling": "False",
            "negative_prompt": "",
            "eta": 0,
            "s_churn": 0,
            "s_tmax": 0,
            "s_tmin": 0,
            "s_noise": 1,
            "sampler_index": "Euler a"
        })
    };
    fetch('https://0b22-85-108-194-26.eu.ngrok.io/sdapi/v1/txt2img', requestOptions)
        .then(response => response.json())
        .then(data => console.log(data));
  }

  const onChange = (imageList, addUpdateIndex) => {
    // data for submit
    console.log(imageList, addUpdateIndex);
    setImages(imageList);
  };

  const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
  };

  return (
    <div className="UploadImage">
    <TextField onChange={handleTextChange} defaultValue="Hello world" inputProps={{ 'aria-label': 'description' }} />
    <Button onClick={text2ImgPost}>Text 2 Image</Button>
      <ImageUploading
        multiple
        value={images}
        onChange={onChange}
        maxNumber={maxNumber}
        dataURLKey="data_url"
      >
        {({
          imageList,
          onImageUpload,
          onImageRemoveAll,
          onImageUpdate,
          onImageRemove,
          isDragging,
          dragProps,
        }) => (
        <Stack spacing={1}>

            {
                imageList.length>0 ? (
                    <Box textAlign='center'>
                        <img src={images[0]['data_url']} alt="" loading="lazy" height={"80%"} width="80%" />
                        <div className="image-item__btn-wrapper">
                        <Fab variant="extended" onClick={() => detectImageRegions(images[0])} disabled={images.length===0} >
                            <IceSkatingSharp sx={{ mr: 1 }} />
                            Detect
                        </Fab>
                        <Box>
                            <Box textAlign='left'>
                                <Button onClick={() => onImageUpdate(0)}>Update</Button>
                            </Box>
                            <Box textAlign='right'>
                                <Button onClick={() => onImageRemove(0)}>Remove</Button>
                            </Box>
                        </Box>
                        </div>
                    </Box>
                ) : (
                    <Button
                    style={isDragging ? { color: 'red' } : undefined}
                    onClick={onImageUpload}
                    {...dragProps}
                  >
                    Click or Drop here
                  </Button>
                )
            }
            {/* For other variants, adjust the size with `width` and `height` */}
            <Skeleton variant="rounded" width={"100%"} height={60} />
        </Stack>
        )}
      </ImageUploading>
    </div>
  );
}

export default UploadImage;