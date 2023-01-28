import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import Footer from './Footer';
import ResponsiveAppBar from './Header';
import UploadImage from './uploadImage';

const theme = createTheme();

export default function Main() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ResponsiveAppBar />
      <main>
          <UploadImage />
      </main>
      <Box sx={{ bgcolor: 'background.paper', p: 6 }} component="footer">
        <Footer />
      </Box>
    </ThemeProvider>
  );
}