import React, { useState } from "react";
import {
  Drawer,
  Box,
  IconButton,
  Typography,
  Divider,
  Fab,
  Tooltip,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import CloseIcon from "@mui/icons-material/Close";
import { tokens } from "../Theme";

const DRAWER_WIDTH = 380;

function CustomeDrawer({
  children,
  title = "Controls",
  icon = <TuneIcon sx={{ fontSize: 19 }} />,
  anchor = "right",
  defaultOpen = false,
  open: openProp,
  onClose,
  showTrigger = true,
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);

  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;

  const handleOpen = () => {
    if (!isControlled) setInternalOpen(true);
  };

  const handleClose = () => {
    if (isControlled) {
      onClose?.();
    } else {
      setInternalOpen(false);
    }
  };

  return (
    <>
     
      <Drawer
        anchor={anchor}
        open={open}
        onClose={handleClose}
        ModalProps={{ keepMounted: true }}
        sx={{
        //   zIndex: (t) => t.zIndex.modal + 1,
        }}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: DRAWER_WIDTH },
            borderRadius:
              anchor === "right"
                ? "16px 0 0 16px"
                : anchor === "left"
                ? "0 16px 16px 0"
                : 0,
            boxShadow: "0 8px 32px rgba(0,0,0,0.35)",
            // zIndex: (t) => t.zIndex.modal + 2,
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: "9px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: (t) =>
                  t.palette.mode === "dark" ? "rgba(34,211,196,0.14)" : "rgba(15,156,144,0.10)",
                color: "primary.main",
              }}
            >
              {icon}
            </Box>
            <Typography sx={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, fontSize: "1.05rem" }}>
              {title}
            </Typography>
          </Box>

          <IconButton size="small" onClick={handleClose}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Divider />

        <Box sx={{ flex: 1, overflowY: "auto", p: 2.5 }}>{children}</Box>
      </Drawer>
    </>
  );
}

export default CustomeDrawer;