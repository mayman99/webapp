import React, { ReactNode } from 'react';
import ImageUploading from 'react-images-uploading';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { Button } from '@mui/material';
import { Box }  from '@mui/material';
import { Fab, Paper, Grid } from '@mui/material';
import { IceSkatingSharp, PestControlRodentSharp } from '@mui/icons-material';
import {TextField} from '@mui/material';
import EditCanvas from './EditImage';
import { styled } from '@mui/material/styles';
import { request } from 'https';

const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
    height: '100%'
}));

enum appStates {
    detecting = "detecting",
    loading = "loading",
    generating= "generating",
    processing= "processing",
    uploading= "uploading",
    init= "init"
};

function UploadImage() {
    
    // Current state image
    const [currentImage, setcurrentImage] = React.useState('');
    
    const [uploadedImages, setuploadedImages] = React.useState([]);
    const [resultImage, setResultImage] = React.useState('');
    const [maskImage, setMaskImage] = React.useState('');
    const [text, setText] = React.useState('');
    const [replaceText, setReplaceText] = React.useState('');
    const [appState, setAppState] = React.useState(appStates.init);
    const maxNumber = 1;
    const [selectedImage, setSelectedImage] = React.useState(null);
    const [objectstMasks, setObjectstMasks] = React.useState([]);
    
    
    async function text2ImgPost() {
        // change to an async function later
        const requestOptions = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "enable_hr": "False",
                "denoising_strength": 0,
                "firstphase_width": 0,
                "firstphase_height": 0,
                "prompt": text,
                "styles": [],
                "seed": -1,
                "subseed": -1,
                "subseed_strength": 0,
                "seed_resize_from_h": -1,
                "seed_resize_from_w": -1,
                "batch_size": 1,
                "n_iter": 1,
                "steps": 60,
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
                "sampler_index": "Euler a"
            })
        };
        const postResponse = fetch('https://2ecc-88-236-65-26.ngrok.io/sdapi/v1/txt2img', requestOptions)
        .then(response => response.json())
        .then(data => {console.log(data); setResultImage(data['images'][0])})
    }
    
    async function replaceRegion() {
        const initImage = uploadedImages.length>0 ? uploadedImages[0].data_url : `data:image/png;base64,${resultImage}`;
        const maskImageInput = maskImage.length>0 ? maskImage : "None";
        
        const img2imgReq = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "init_images": [initImage],
                "resize_mode": 0,
                "denoising_strength": 0.75,
                "mask": maskImageInput,
                "mask_blur": 4,
                "inpainting_fill": 0,
                "inpaint_full_res": "True",
                "inpaint_full_res_padding": 0,
                "inpainting_mask_invert": 0,
                "prompt": replaceText,
                "styles": [],
                "seed": -1,
                "subseed": -1,
                "subseed_strength": 0,
                "seed_resize_from_h": -1,
                "seed_resize_from_w": -1,
                "batch_size": 1,
                "n_iter": 1,
                "steps": 60,
                "cfg_scale": 9,
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
                "include_init_images": "False"
            })
        };
        
        const finalResponse = fetch('https://2ecc-88-236-65-26.ngrok.io/sdapi/v1/img2img', img2imgReq)
        .then(response => response.json())
        .then(data => {console.log(data); setResultImage(data['images'][0])})
        
    }
    
    async function detect() {
        setAppState(appStates.detecting);
        const initImage = uploadedImages.length>0 ? uploadedImages[0].data_url : `data:image/png;base64,${resultImage}`;
        const res = await fetch("https://172.17.0.2:8080/detect", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            "image": initImage,
        }),
    }).then(response => response.json())
    .then(data => {console.log(data); setcurrentImage(data['image']); setObjectstMasks(data['cnts']);})
}

function overlayMasks() {
        const areas : string [] = [];
        objectstMasks.forEach(objectMask => {
            const coordinates : number[] = [];
            objectMask.forEach(point => {
                coordinates.push(...point);
            });
            areas.push(coordinates.toString());
        })
        console.log(areas[0])
        return areas;
}

const onChange = (imageList, addUpdateIndex) => {
    setAppState(appStates.uploading);
    setuploadedImages(imageList);
    setcurrentImage(imageList[0]);
};

const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setText(event.target.value);
};

const handleReplacmentTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setReplaceText(event.target.value);
};

return (
    <>
    {appState===appStates.init ? 
        (<Box sx={{ width: '100%' }}>
        <Grid container   justifyContent="space-evenly" direction="column" spacing={3} >
        <Grid item xs={5}>
        <Item elevation={3}>
        <Stack spacing={2}>
        <Box textAlign='center'>
        <TextField placeholder='Enter photo description here' onChange={handleTextChange} value={text} inputProps={{ 'aria-label': 'description' }} />
        </Box>
        <Box textAlign='center'>
        <Button size="large" variant='contained' onClick={text2ImgPost}>Generate image from text or upload your own</Button>
        </Box>
        </Stack>
        </Item>
        </Grid>
        <Grid item xs={2}>
        <Item elevation={1}>
        <map name="infographic">
        <area shape="poly" coords="130,147,200,107,254,219,130,228"
        href="https://developer.mozilla.org/docs/Web/HTML"
        target="_blank" alt="HTML" onClick={()=> {console.log('add to selected regions');}}> 
        </area>
        <area shape="poly" coords="130,147,130,228,6,219,59,107"
        href="https://developer.mozilla.org/docs/Web/CSS"
        target="_blank" alt="CSS"/>
        <area shape="poly" coords="130,147,200,107,130,4,59,107"
        href="https://developer.mozilla.org/docs/Web/JavaScript"
        target="_blank" alt="JavaScript"/>
        </map>
    <img useMap="#infographic" src="https://cdn.pixabay.com/photo/2015/10/01/17/17/car-967387_960_720.png" alt="MDN infographic"/>
    </Item>
    </Grid>
    <Grid item xs={5}>
    <Item elevation={3}>
    <Box textAlign='center'>
    <ImageUploading
    multiple
    value={uploadedImages}
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
        <>
        {
            imageList.length>0 ? (
                <Box textAlign='center'>
                <div className="image-item__btn-wrapper">
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
                    size="large" variant='contained'
                    style={isDragging ? { color: 'red' } : undefined}
                    onClick={onImageUpload}
                    {...dragProps}
                    >
                    Click to upload or Drop here
                    </Button>
                    )
                }
                </>
                )}
                </ImageUploading>
                </Box>
                </Item>
                </Grid>
                </Grid>
                </Box>):(
                    <Box textAlign='center'>
                    <Stack spacing={1}>
                    <Box>
                    <Box>
                        {objectstMasks.length>0?
                            (<>
                                <map name="mask">
                                    {overlayMasks().map((coords) => {
                                        return (<area coords={coords} shape="poly" href="https://developer.mozilla.org/docs/Web/JavaScript"
                                        target="_blank" alt="JavaScript" />);
                                    })}
                                </map>
                                <img useMap="#mask" src={`data:image/jpeg;base64,${currentImage}`} alt="" loading="lazy" height={"512"} width="512" />
                            </>
                            ):(<img src={`data:image/jpeg;base64,${currentImage}`} alt="" loading="lazy" height={"512"} width="512" />)
                        }
                    </Box>
                    
                    {/* {uploadedImages.length>0 ?
                        (
                            <Stack>
                            <Box>
                            <img src={uploadedImages[0]['data_url']} alt="" loading="lazy" height={"512"} width="512" />
                            
                            </Box>
                            <Box>
                            <EditCanvas ImageBase64={uploadedImages[0]['data_url']} onMaskImageChange={setMaskImage} />
                            </Box>
                            </Stack>
                            ):(
                                null
                                )
                            }
                            {resultImage ?
                                (
                                    <Stack>
                                    <Box>
                                    <img src={`data:image/jpeg;base64,${resultImage}`} alt="" loading="lazy" height={"512"} width="512" />
                                    </Box>
                                    <Box>
                                    <EditCanvas ImageBase64={`data:image/jpeg;base64,${resultImage}`} onMaskImageChange={setMaskImage}  />
                                    </Box>
                                    </Stack>
                                    ):(
                                        null
                                        )
                                    } */}
                                    
                                    </Box>
                                    <Box textAlign='center'>
                                    <Button size="large" variant='contained' onClick={detect}>Detect</Button>
                                    </Box>
                                    </Stack>
                                    </Box>
                                    
                                    
                                    )}
                                    
                                    </>
                                    );
                                }
                                
                                export default UploadImage;
                                