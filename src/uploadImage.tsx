import React, { ReactNode } from 'react';
import ImageUploading from 'react-images-uploading';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { Button } from '@mui/material';
import { Box } from '@mui/material';
import { Fab, Paper, Grid } from '@mui/material';
import { TextField, Grow } from '@mui/material';
import EditCanvas from './EditImage';
import { styled } from '@mui/material/styles';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import CircularProgress from '@mui/material/CircularProgress';
import { img2imgReqBody } from './utils';

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
    Done = "done",
    Error = "error",
    ThreeD = "3d"
};

function UploadImage() {

    // Current state image
    const [currentImage, setcurrentImage] = React.useState('');
    const [uploadedImages, setuploadedImages] = React.useState([]);
    const [resultImage, setResultImage] = React.useState('');
    const [maskImage, setMaskImage] = React.useState('');
    const [replaceText, setReplaceText] = React.useState('');
    const [text, setText] = React.useState('');
    const [appState, setAppState] = React.useState(appStates.init);
    const maxNumber = 1;
    const [resizedImage, setResziedImage] = React.useState('');
    const [objectstMasks, setObjectstMasks] = React.useState([]);

    async function replaceRegion() {
        const initImage = resizedImage;
        const maskImageInput = maskImage.length > 0 ? maskImage : "None";
        const img2imgReq = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: img2imgReqBody(initImage, maskImage, text)
        };

        const finalResponse = fetch('https://01ff-85-108-192-163.ngrok.io/sdapi/v1/img2img', img2imgReq)
            .then(response => response.json())
            .then(data => { console.log(data); setResultImage(data['images'][0]); setAppState(appStates.Done) })
    }

    async function detect() {
        setAppState(appStates.detecting);
        const initImage = uploadedImages.length > 0 ? uploadedImages[0].data_url : `data:image/png;base64,${resultImage}`;
        const res = await fetch("https://5191-78-184-159-119.ngrok-free.app/detect", {
            method: "POST",
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "image": initImage,
            }),
        }).then(response => response.json())
            .then(data => { setAppState(appStates.Editing); setcurrentImage(data['image']); setResziedImage(data['resized']); setObjectstMasks(data['cnts']); })
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
                        <EditCanvas ImageBase64={`data:image/png;base64,${currentImage}`} masks={overlayMasksArray()} onMaskImageChange={setMaskImage} setText={setReplaceText} setAppState={setAppState} />
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
