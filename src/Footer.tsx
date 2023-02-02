import { Typography, Box, Link } from "@mui/material";
import BrushIcon from '@mui/icons-material/Brush';

function Copyright() {
    return (
      <Typography variant="body2" color="text.secondary" align="center">
        {'Copyright © '}
        <Link color="inherit" href="https://ai-artist.app/">
          AI-Artist
        </Link>{' '}
        {new Date().getFullYear()}
        {'.'}
      </Typography>
    );
  }

function Footer() {
  
    return (
      <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
        <Typography variant="h6" align="center" gutterBottom>
          AI - ARTIST <BrushIcon fontSize="small" />
        </Typography>
        <Typography
          variant="subtitle1"
          align="center"
          color="text.secondary"
          component="p"
        >
          AI to Help You Create!
        </Typography>
        <Copyright />
      </Box>
    )
};

export default Footer;
