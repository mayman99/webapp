import React, {useCallback} from "react";
import { createRoot } from "react-dom/client";
import { Stage, Layer, Image, Text, Line, Rect } from "react-konva";
import useImage from "use-image";
import { Box } from "@mui/system";

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

type EditCanvasProps = {
  ImageBase64: string;
  onMaskImageChange: React.Dispatch<React.SetStateAction<string>>;
};

const imageElement = (ImageBase64: string) => (<img src={`data:image/jpeg;base64,${ImageBase64}`} alt="" loading="lazy" height="512" width="512" />);

const EditCanvas = ({ ImageBase64, onMaskImageChange }: EditCanvasProps) => {

  const [image] = useImage(ImageBase64);

// class EditCanvas extends React.Component<EditCanvasProps> {
    const [tool, setTool] = React.useState("pen");
    const [lines, setLines] = React.useState([]);
    const isDrawing = React.useRef(false);
    const dragUrl = React.useRef();
    const stageRef = React.useRef(null);
    const [images, setImages] = React.useState([]);
    const [hideImageFromStage, setHideImageFromStage] = React.useState([]);
  
    const handleExport = () => {
      stageRef.current.getStage().getLayers()[1].destroy();
      const uri = stageRef.current.toDataURL();
      
      onMaskImageChange(uri);
      console.log(uri);
      // we also can save uri as file
      // but in the demo on Konva website it will not work
      // because of iframe restrictions
      // but feel free to use it in your apps:
      downloadURI(uri, 'stage.png');
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
      <button onClick={handleExport}>Click here to log stage data URL</button>
      <Box textAlign='center'>
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
        </Stage>
        </Box>
      </>
      );
}

export default EditCanvas;
