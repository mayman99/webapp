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
import Room2DStage from './Room2DStage';
import Room3DStage from './Room3DStage';
import { pixelLocationTo3DLocation } from './utils';
const MasterNodeURL = "http://localhost:8000";
const uploadInitImageURL = MasterNodeURL + "/upload-image";
const uploadInitPoints = MasterNodeURL + "/upload-points";


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

export type Model3D = {
    position: number[],
    rot: number,
    path: string,
};

export type DrawingPoint = {
    x: number,
    y: number,
    type: string
};

function DrawRoom() {

    // Current state image
    const [currentImage, setcurrentImage] = React.useState('');
    const [uploadedImages, setuploadedImages] = React.useState([]);
    const [RoomKeySegments, setRoomKeySegments] = React.useState(Array<RoomKeySegment>());
    const [models, setModels] = React.useState(Array<Model3D>());
    const [initImage, setInitImage] = React.useState('');
    const [initPoints, setInitPoints] = React.useState(Array<RoomKeySegment>());
    const [resultImage, setResultImage] = React.useState('');
    const [maskImage, setMaskImage] = React.useState('');
    const [replaceText, setReplaceText] = React.useState('');
    const [text, setText] = React.useState('');
    const [appState, setAppState] = React.useState(appStates.Editing);
    const maxNumber = 1;
    const [resizedImage, setResziedImage] = React.useState('');
    const [objectstMasks, setObjectstMasks] = React.useState([]);

    // send a post call to server when initImage is changed
    React.useEffect(() => {
        async function setData(data) {
            const scale = 6.0;
            console.log('setting scale manually')
            const models: Model3D[] = [];
            const results_array = data['result'][0]['result'];	
            console.log(results_array);
            for (let index = 0; index < results_array.length; index++) {
                const obj = results_array[index];
                // convert degrees to radians
                const orientation = obj['orientation'] * Math.PI / 180;
                const cartesian_loc = pixelLocationTo3DLocation(obj['location'][0], obj['location'][1], scale);
                const path = obj['path'];
                console.log("cart loc of ", obj['location'], "given scale of 6, ", cartesian_loc)
                models.push({ path: path, position: [cartesian_loc[0], cartesian_loc[1], 0] , rot: orientation });                
            }

            // Classical approach deprecated in favor of NN approach
            // for (const result_dict of results_array) {
            //     console.log(result_dict);
            //     const path = result_dict['path'];
            //     console.log(path);
            //     if (path){
            //         const locations = result_dict['locations'];
            //         for (let i = 0; i < locations.length; i++) {
            //             models.push({ path: path, position: [locations[i][0]/10, locations[i][0]/10, 0] , rot: 0 });
            //         }
            //     }
            // }
            console.log(models);
            setModels(models);
        }

        async function postInitImage() {
            const base64Image = initImage.split(",")[1];

            // Send the POST request to the FastAPI endpoint
            fetch(uploadInitImageURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: base64Image,
                }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Response:', data);
                    setData(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        };

        async function postInitPoints() {

            // Send the POST request to the FastAPI endpoint
            fetch(uploadInitPoints, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data: initPoints
                }),
            })
                .then(response => response.json())
                .then(data => {
                    console.log('Response:', data);
                    setData(data);
                })
                .catch(error => {
                    console.error('Error:', error);
                });
        };


        if (initImage !== '')
            postInitImage();

        if (initPoints.length > 0)
            postInitPoints();

    }, [initImage, initPoints, setModels]);

    return (
        <>
            {appState === appStates.Editing &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Item>
                        <Room2DStage setAppState={setAppState} setRoomKeySegments={setRoomKeySegments} setInitImage={setInitImage} setInitPoints={setInitPoints} />
                    </Item>
                </Grow>
            }
            {appState === appStates.ThreeD &&
                <Grow in {...(1 ? { timeout: 1000 } : {})}>
                    <Box sx={{ height: '100%' }} height={'1000px'}>
                        <Item>
                            <Room3DStage models={models} setAppState={setAppState} RoomKeySegments={RoomKeySegments} />
                        </Item>
                    </Box>
                </Grow>
            }
        </>
    );
}

export default DrawRoom;
