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
import Room2DStage from './Room2DStage';
import Box3D from './Room3DStage';
import Room3DStage from './Room3DStage';

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

export type RoomKeySegment = {
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    type: string
};

function DrawRoom() {

    // Current state image
    const [currentImage, setcurrentImage] = React.useState('');
    const [uploadedImages, setuploadedImages] = React.useState([]);
    const [RoomKeySegments, setRoomKeySegments] = React.useState(Array<RoomKeySegment>());
    const [resultImage, setResultImage] = React.useState('');
    const [maskImage, setMaskImage] = React.useState('');
    const [replaceText, setReplaceText] = React.useState('');
    const [text, setText] = React.useState('');
    const [appState, setAppState] = React.useState(appStates.Editing);
    const maxNumber = 1;
    const [resizedImage, setResziedImage] = React.useState('');
    const [objectstMasks, setObjectstMasks] = React.useState([]);

    return (
        <>
        {appState === appStates.Editing &&
            <Grow in {...(1 ? { timeout: 1000 } : {})}>
                <Item>
                    <Room2DStage setAppState={setAppState} setRoomKeySegments={setRoomKeySegments} />
                </Item>
            </Grow>
        }  
        {appState === appStates.ThreeD &&
            <Grow in {...(1 ? { timeout: 1000 } : {})}>
                <Box sx={{ height: '100%' }} height={'1000px'}>
                    <Item>
                        <Room3DStage setAppState={setAppState} RoomKeySegments={RoomKeySegments} />
                    </Item>
                </Box>
            </Grow>
        }   
        </>
    );
}

export default DrawRoom;
