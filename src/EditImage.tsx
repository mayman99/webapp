import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { Stage, Layer, Image, Text, Line, Rect } from "react-konva";
import useImage from "use-image";
import { Box } from "@mui/system";
import Konva from "konva";
import { LineConfig } from "konva/lib/shapes/Line";
import { Button, Stack } from "@mui/material";
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import BrushIcon from '@mui/icons-material/Brush';
import { SpaceBar } from "@mui/icons-material";
import { appStates } from "./uploadImage";

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

type EditCanvasProps = {
  ImageBase64: string;
  onMaskImageChange: React.Dispatch<React.SetStateAction<string>>;
  setAppState: React.Dispatch<React.SetStateAction<appStates>>;
  masks: number[][];
};

const EditCanvas = ({ ImageBase64, onMaskImageChange, masks, setAppState }: EditCanvasProps) => {

  const [editingState, setEditingState] = React.useState(EditingStates.Selecting);
  const [image] = useImage(ImageBase64);
  const [tool, setTool] = React.useState("pen");
  const [lines, setLines] = React.useState([]);
  const isDrawing = React.useRef(false);
  const dragUrl = React.useRef();
  const stageRef = React.useRef(null);
  const [images, setImages] = React.useState([]);
  const [hideImageFromStage, setHideImageFromStage] = React.useState([]);
  const [polyLines, setPolyLines] = React.useState([]);
  const [polyLine, setPolyLine] = React.useState([]);

  // draw polys for each mask, add mouse click and hover listeners.
  React.useEffect(() => {
    const lines = stageRef.current.find('Line');
    for (let line = 0; line < lines.length; line++) {
      const element = lines[line];
      element.on('mouseover touchstart', function () {
        if (this.opacity() < 0.8)
          this.opacity(0.7);
      });
      element.on('mouseout touchend', function () {
        if (this.opacity() < 0.8)
          this.opacity(0.0);
      });
      element.on('click', function () {
        this.fill('black');
        this.opacity(0.9);
      });
    }
  }, [masks, stageRef]);


  const switchBrushSelect = () => {
    if (editingState === EditingStates.Selecting) {
      const newLines = stageRef.current.find('Line');
      setLines([newLines]);
      console.log(newLines);
      stageRef.current.getStage().getLayers()[3].
        setEditingState(EditingStates.Brushing)
    }
    else
      setEditingState(EditingStates.Selecting)

  };

  const handleExport = () => {
    stageRef.current.getStage().getLayers()[1].destroy();
    const uri = stageRef.current.toDataURL();
    onMaskImageChange(uri);
    setAppState(appStates.Replacing);
    downloadURI(uri, 'ai-artist.app');
  };

  const handleMouseDown = (e) => {
    isDrawing.current = true;
    const pos = e.target.getStage().getPointerPosition();
    setLines([...lines, { tool, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e) => {
    // no drawing - skipping
    if (!isDrawing.current) {
      return;
    }
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    let lastLine = lines[lines.length - 1];
    // add point
    lastLine.points = lastLine.points.concat([point.x, point.y]);

    // replace last
    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  return (
    <>
      {/* <Button onClick={handleExport}>Click here to log stage data URL</Button> */}
      <Stack spacing={3}>
        <Box>
          <Button variant="contained" color='success'>Brush is enabled<BrushIcon /></Button>
        </Box>
        <Box>
          <Stage
            width={640}
            height={480}
            style={{ border: "2px solid black" }}
            ref={stageRef}
            onMouseDown={handleMouseDown}
            onMousemove={handleMouseMove}
            onMouseup={handleMouseUp}
          >
            <Layer>
              <Rect
                width={640}
                height={480}
                fill="white"
              />
            </Layer>
            <Layer>
              <Image image={image} />
            </Layer>
            <Layer>
              {lines.map((line, i) => (
                <Line
                  key={i}
                  points={line.points}
                  stroke="#000000"
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
              {editingState === EditingStates.Selecting && masks.map((mask, i) => (
                <Line
                  key={i}
                  points={mask}
                  strokeWidth={10}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  fill="#000000"
                  opacity={0.0}
                  closed
                />
              ))}
            </Layer>
          </Stage>
          <SpaceBar />
          <Stack spacing={2}>
            <Box>
              <Button variant="contained" disabled>Replace selected regions<NavigateNextIcon /></Button>
            </Box>
            <Box>
              <Button variant="contained" onClick={handleExport}>Remove selected regions<NavigateNextIcon /></Button>
            </Box>
          </Stack>
        </Box>
      </Stack>
    </>
  );
}

export default EditCanvas;
