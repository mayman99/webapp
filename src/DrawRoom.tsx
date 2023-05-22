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
    Done = "done"
};

function DrawRoom() {

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
        setAppState(appStates.Editing);
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
            {appState === appStates.Editing &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                        <EditCanvas ImageBase64={`${currentImage}`} masks={overlayMasksArray()} onMaskImageChange={setMaskImage} setText={setReplaceText} setAppState={setAppState} />
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

export default DrawRoom;
