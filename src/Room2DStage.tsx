import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Stage, Layer, Image, Text, Line, Rect } from "react-konva";
import useImage from "use-image";
import { Box } from "@mui/system";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import Konva from "konva";
import { Button, Stack, TextField } from "@mui/material";
import BrushIcon from '@mui/icons-material/Brush';
import { Segment, SpaceBar } from "@mui/icons-material";
import { appStates } from "./uploadImage";
import { RoomKeySegment } from "./DrawRoom";
import { LineConfig } from "konva/lib/shapes/Line";

const URLImage = ({ image }) => {
  const [img] = useImage(image.src);
  return (
    <Image
      image={img}
      x={image.x}
      y={image.y}
      // I will use offset to set origin to the center of the image
      offsetX={img ? img.width / 2 : 0}
      offsetY={img ? img.height / 2 : 0}
    />
  );
};

function downloadURI(uri, name) {
  var link = document.createElement("a");
  link.download = name;
  link.href = uri;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

enum EditingStates {
  Brushing = "Brushing",
  Selecting = "Selecting"
};

type Edit2DCanvasProps = {
  setAppState: React.Dispatch<React.SetStateAction<appStates>>;
  setRoomKeySegments: React.Dispatch<React.SetStateAction<RoomKeySegment[]>>;
};

const StageToKeyPoints = (lines: LineConfig[]) => {
  const keySegments: RoomKeySegment[] = [];
  lines.forEach((line) => {
    keySegments.push({ x1: line.points[0], y1: line.points[1], x2: line.points[2], y2: line.points[3], type: "wall" });
  });
  return keySegments;
};

const Room2DStage = ({ setAppState, setRoomKeySegments }: Edit2DCanvasProps) => {

  const [tool, setTool] = React.useState("pen");
  const [brush, setBrush] = React.useState('walls');
  const [wallLines, setWallLines] = React.useState([]);
  const [doorLines, setDoorLines] = React.useState([]);
  const [windowLines, setWindowLines] = React.useState([]);

  const isDrawing = React.useRef(false);
  const stageRef = React.useRef(null);

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    switch (brush) {
      case 'walls': {
        setWallLines([...wallLines, { tool, points: [pos.x, pos.y] }]);
        break;
      } 
      case 'doors': {
        setDoorLines([...doorLines, { tool, points: [pos.x, pos.y] }]);
        break;
      }
      case 'windows': {
        setWindowLines([...windowLines, { tool, points: [pos.x, pos.y] }]);
        break;
      }
      } 
    };

  const handleMouseMove = (e) => {
    // no drawing - skipping
    if (!isDrawing.current) {
      return;
    }
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    switch (brush) {
      case 'walls': {
        let lastLine = wallLines[wallLines.length - 1];
        // add point
        lastLine.points = lastLine.points.slice(0, 2).concat([point.x, point.y]);
        // replace last
        wallLines.splice(wallLines.length - 1, 1, lastLine);
        setWallLines(wallLines.concat());
        break;
      }
      case 'doors': {
        let lastLine = doorLines[doorLines.length - 1];
        // add point
        lastLine.points = lastLine.points.slice(0, 2).concat([point.x, point.y]);
        // replace last
        doorLines.splice(doorLines.length - 1, 1, lastLine);
        setDoorLines(doorLines.concat());
        break;
      }
      case 'windows': {
        let lastLine = windowLines[windowLines.length - 1];
        // add point
        lastLine.points = lastLine.points.slice(0, 2).concat([point.x, point.y]);
        // replace last
        windowLines.splice(windowLines.length - 1, 1, lastLine);
        setWindowLines(windowLines.concat());
        break;
      }
    }
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const switchBrush = (brush: string) => () => {
    setBrush(brush);
  }

  const to3D = () => {
    const segments : RoomKeySegment[] = StageToKeyPoints(wallLines);
    segments.concat(StageToKeyPoints(doorLines));
    segments.concat(StageToKeyPoints(windowLines));    
    setRoomKeySegments(segments);
    setAppState(appStates.ThreeD);
  };

  return (
    <>
      <Stack spacing={3}>
        <Box>
          <p>Drawing</p>
          <Button onClick={switchBrush('walls')} variant="contained" color={brush === 'walls' ? 'success': 'info'}>Walls<BrushIcon /></Button>
          <span> </span>
          <Button onClick={switchBrush('doors')} variant="contained" color={brush === 'doors' ? 'success': 'info'}>Doors<BrushIcon /></Button>
          <span> </span>
          <Button onClick={switchBrush('windows')} variant="contained" color={brush === 'windows' ? 'success': 'info'}>windows<BrushIcon /></Button>
        </Box>
        <Box>
          <Stage
            width={512}
            height={512}
            style={{ border: "2px solid black" }}
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
          >
            <Layer>
              <Rect
                width={512}
                height={512}
                fill="white"
              />
            </Layer>
            {/* background grid image for guidance
            <Layer>
              <Image image={image} />
            </Layer> */}
            <Layer>
              {wallLines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke='#000000'
                  strokeWidth={10}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                />
              ))}
            </Layer>
            <Layer>
              {windowLines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke='#00ff00'
                  strokeWidth={10}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                />
              ))}
            </Layer>
            <Layer>
              {doorLines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke='#ff00ff'
                  strokeWidth={10}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation={
                    line.tool === "eraser" ? "destination-out" : "source-over"
                  }
                />
              ))}
            </Layer>
          </Stage>
          <SpaceBar />
        </Box>
        <Box textAlign='center'>
          <Button size="large" color="success" variant='contained' onClick={to3D}>Proceed to 3D <NavigateNextIcon /></Button>
        </Box>
      </Stack>
    </>
  );
}

export default Room2DStage;
