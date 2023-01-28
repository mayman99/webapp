import React, { ReactNode } from 'react';
import ImageUploading from 'react-images-uploading';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { Button } from '@mui/material';
import { Box } from '@mui/material';
import { Fab, Paper, Grid } from '@mui/material';
import { ConstructionOutlined, IceSkatingSharp, PestControlRodentSharp } from '@mui/icons-material';
import { TextField, Grow } from '@mui/material';
import EditCanvas from './EditImage';
import { styled } from '@mui/material/styles';
import { request } from 'https';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { LatLngLiteral } from 'leaflet';
import { LatLngExpression } from 'leaflet';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CircularProgress from '@mui/material/CircularProgress';


const Item = styled(Paper)(({ theme }) => ({
    backgroundColor: theme.palette.mode === 'dark' ? '#1A2027' : '#fff',
    ...theme.typography.body2,
    padding: theme.spacing(1),
    textAlign: 'center',
    color: theme.palette.text.secondary,
    height: '100%'
}));

export enum appStates {
    detecting = "detecting",
    loading = "loading",
    generating = "generating",
    processing = "processing",
    uploading = "uploading",
    init = "init",
    Editing = "editing",
    Replacing = "replacing",
    Done = "done"
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

    async function replaceRegion() {
        // const initImage = `data:image/png;base64,${currentImage}`;
        const initImage = uploadedImages.length > 0 ? uploadedImages[0].data_url : `data:image/png;base64,${resultImage}`;
        const maskImageInput = maskImage.length > 0 ? maskImage : "None";
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
                "inpainting_mask_invert": 1,
                "prompt": '',
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
                "override_settings": {},
                "sampler_index": "Euler a",
                "include_init_images": "False"
            })
        };

        const finalResponse = fetch('https://9fd6-85-108-192-163.ngrok.io/sdapi/v1/img2img', img2imgReq)
            .then(response => response.json())
            .then(data => { console.log(data); setResultImage(data['images'][0]); setAppState(appStates.Done) })

    }

    async function detect() {
        setAppState(appStates.detecting);
        const initImage = uploadedImages.length > 0 ? uploadedImages[0].data_url : `data:image/png;base64,${resultImage}`;
        const res = await fetch("https://5753-85-108-192-163.eu.ngrok.io/detect", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "image": initImage,
            }),
        }).then(response => response.json())
            .then(data => { console.log(data); setAppState(appStates.Editing); setcurrentImage(data['image']); setObjectstMasks(data['cnts']); })
    }

    function overlayMasksArray() {
        const areas: number[][] = [];
        objectstMasks.forEach(objectMask => {
            const coordinates: number[] = [];
            objectMask.forEach(point => {
                coordinates.push(...point);
            });
            areas.push(coordinates.flat(1));
        })
        return areas;
    }

    const onChange = (imageList, addUpdateIndex) => {
        setAppState(appStates.processing);
        setuploadedImages(imageList);
        setcurrentImage(imageList[0].data_url);
    };

    const handleTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setText(event.target.value);
    };

    const handleReplacmentTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setReplaceText(event.target.value);
    };

    return (
        <>
            {appState === appStates.init &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
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
                                            imageList.length > 0 ? (
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
                </Grow>
            }
            {appState === appStates.processing &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                        <Stack spacing={1}>
                            <Box sx={{ textAlign: 'center' }}>
                                    <img src={currentImage} alt="" loading="lazy" />
                            </Box>
                            <Box textAlign='center'>
                                <Button size="large" variant='contained' onClick={detect}>Process <NavigateNextIcon /></Button>
                            </Box>
                        </Stack>
                    </Item>
                </Grow>
            }
            {appState === appStates.Editing &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                        <EditCanvas ImageBase64={`data:image/png;base64,${currentImage}`} masks={overlayMasksArray()} onMaskImageChange={setMaskImage} setAppState={setAppState} />
                    </Item>
                </Grow>
            }
            {appState === appStates.detecting &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                        <CircularProgress />
                    </Item>
                </Grow>
            }
            {appState === appStates.Replacing &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                        <CircularProgress onAnimationStartCapture={replaceRegion} />
                    </Item>
                </Grow>
            }
            {appState === appStates.Done &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                    <img src={`data:image/png;base64,${currentImage}`} alt="" loading="lazy" />
                    <img src={maskImage} alt="" loading="lazy" />

                        <img src={`data:image/png;base64,${resultImage}`} alt="" loading="lazy" />
                    </Item>
                </Grow>
            }
        </>
    );
}

export default UploadImage;
