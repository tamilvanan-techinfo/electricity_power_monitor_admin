// FloatingWebviewPanel.jsx
import * as React from 'react';
import PropTypes from 'prop-types';
import { Box, Paper, Stack, Typography, Tooltip, IconButton } from '@mui/material';
import DragIndicatorRoundedIcon from '@mui/icons-material/DragIndicatorRounded';
import OpenInFullRoundedIcon from '@mui/icons-material/OpenInFullRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';

const PANEL_WIDTH = 320;
const EDGE_MARGIN = 16;

// The real resolution the target page is designed for (it uses 100vw/100vh
// layout, so it must be rendered at something close to its actual display
// size — shrinking the <iframe> element itself just re-lays-out the page at
// a tiny viewport and clips it). We render at this size, then scale the
// whole frame down to fit the panel.
const SOURCE_WIDTH = 1280;
const SOURCE_HEIGHT = 720;

function FloatingWebviewPanel({ src, title = 'Live Preview', initialPosition }) {
  const isElectron = typeof window !== 'undefined' && !!window.process?.versions?.electron;

  // Scale factor to fit SOURCE_WIDTH into PANEL_WIDTH, preserving aspect ratio.
  const scale = PANEL_WIDTH / SOURCE_WIDTH;
  const scaledHeight = SOURCE_HEIGHT * scale;

  const clamp = React.useCallback(
    (pos) => {
      const maxX = window.innerWidth - PANEL_WIDTH - EDGE_MARGIN;
      const maxY = window.innerHeight - scaledHeight - 40 - EDGE_MARGIN; // + header height
      return {
        x: Math.min(Math.max(pos.x, EDGE_MARGIN), Math.max(maxX, EDGE_MARGIN)),
        y: Math.min(Math.max(pos.y, EDGE_MARGIN), Math.max(maxY, EDGE_MARGIN)),
      };
    },
    [scaledHeight]
  );

  // Computed once (and reusable on demand) so "reset" always returns here,
  // regardless of where initialPosition placed the panel on first mount.
  const getDefaultPosition = React.useCallback(
    () =>
      clamp(
        initialPosition || {
          x: window.innerWidth - PANEL_WIDTH - EDGE_MARGIN * 2,
          y: window.innerHeight - scaledHeight - 40 - EDGE_MARGIN * 2,
        }
      ),
    [clamp, initialPosition, scaledHeight]
  );

  const [position, setPosition] = React.useState(getDefaultPosition);

  const dragState = React.useRef({ dragging: false, offsetX: 0, offsetY: 0 });
  const [isDragging, setIsDragging] = React.useState(false);

  const handlePointerDown = React.useCallback(
    (e) => {
      dragState.current = {
        dragging: true,
        offsetX: e.clientX - position.x,
        offsetY: e.clientY - position.y,
      };
      setIsDragging(true);
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [position]
  );

  const handlePointerMove = React.useCallback(
    (e) => {
      if (!dragState.current.dragging) return;
      setPosition(
        clamp({
          x: e.clientX - dragState.current.offsetX,
          y: e.clientY - dragState.current.offsetY,
        })
      );
    },
    [clamp]
  );

  const handlePointerUp = React.useCallback((e) => {
    dragState.current.dragging = false;
    setIsDragging(false);
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

  const handleResetPosition = React.useCallback(() => {
    setPosition(getDefaultPosition());
  }, [getDefaultPosition]);

  React.useEffect(() => {
    const onResize = () => setPosition((p) => clamp(p));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        width: PANEL_WIDTH,
        borderRadius: 2.5,
        overflow: 'hidden',
        zIndex: 1300,
        border: 1,
        borderColor: 'divider',
        userSelect: isDragging ? 'none' : 'auto',
        boxShadow: isDragging
          ? '0 16px 40px rgba(0,0,0,0.35)'
          : '0 8px 24px rgba(0,0,0,0.2)',
        transition: isDragging ? 'none' : 'top 0.25s ease, left 0.25s ease, box-shadow 0.2s ease',
      }}
    >
      {/* Drag handle */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
          cursor: isDragging ? 'grabbing' : 'grab',
          touchAction: 'none',
        }}
      >
        <DragIndicatorRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, letterSpacing: '0.04em', color: 'text.secondary', flex: 1 }}
        >
          {title}
        </Typography>

        <Tooltip title="Reset position">
          <IconButton
            size="small"
            // Stop the pointer-down from also starting a drag on this button.
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleResetPosition}
            sx={{ p: 0.4 }}
          >
            <RestartAltRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
          </IconButton>
        </Tooltip>

        <Tooltip title="Open in new window">
          <IconButton
            size="small"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => window.open(src, '_blank', 'noopener,noreferrer')}
            sx={{ p: 0.4 }}
          >
            <OpenInFullRoundedIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Clipping viewport at the final scaled-down size */}
      <Box
        sx={{
          width: PANEL_WIDTH,
          height: scaledHeight,
          bgcolor: '#000',
          overflow: 'hidden',
          position: 'relative',
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        {/* Rendered at full source resolution, then scaled down as a whole
            so the target page's 100vw/100vh layout resolves against a
            realistic viewport instead of a tiny one — this is what stops
            it from overflowing/clipping oddly at small panel sizes. */}
        <Box
          sx={{
            width: SOURCE_WIDTH,
            height: SOURCE_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {isElectron ? (
            // eslint-disable-next-line react/no-unknown-property
            <webview
              src={src}
              style={{ width: SOURCE_WIDTH, height: SOURCE_HEIGHT, border: 'none' }}
            />
          ) : (
            <iframe
              title={title}
              src={src}
              style={{ width: SOURCE_WIDTH, height: SOURCE_HEIGHT, border: 'none' }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}

FloatingWebviewPanel.propTypes = {
  src: PropTypes.string.isRequired,
  title: PropTypes.string,
  initialPosition: PropTypes.shape({ x: PropTypes.number, y: PropTypes.number }),
};

export default FloatingWebviewPanel;