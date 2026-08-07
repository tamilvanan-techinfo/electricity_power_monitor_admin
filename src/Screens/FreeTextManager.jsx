import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  Paper,
  TextField,
  Typography,
  Stack,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  Slider,
  useTheme,
  alpha,
} from '@mui/material'
import Select from 'react-select'
import WebFont from 'webfontloader'
import CampaignOutlinedIcon from '@mui/icons-material/CampaignOutlined'
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded'
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import TuneRoundedIcon from '@mui/icons-material/TuneRounded'
import ImageRoundedIcon from '@mui/icons-material/ImageRounded'
import { useSocket } from '../contexts/SocketContext'

// The route your Electron app (and the LED screen itself) renders the
// live free-text display on. The webview below mirrors exactly that page.
const DISPLAY_URL = 'http://localhost:5173/free-text/#/free-text'


const GOOGLE_FONTS = [
  // Sans-serif
  'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter',
  'Nunito', 'Raleway', 'Work Sans', 'Rubik', 'Manrope', 'Barlow',
  // Serif
  'Playfair Display', 'Merriweather', 'Lora', 'PT Serif', 'Cormorant Garamond',
  'Libre Baskerville', 'Crimson Text',
  // Monospace
  'Roboto Mono', 'Source Code Pro', 'JetBrains Mono', 'IBM Plex Mono', 'Space Mono',
  // Display / decorative
  'Bebas Neue', 'Anton', 'Oswald', 'Righteous', 'Alfa Slab One', 'Bungee',
  'Passion One', 'Fjalla One',
  // Handwriting / script
  'Pacifico', 'Dancing Script', 'Great Vibes', 'Caveat', 'Sacramento',
  'Shadows Into Light', 'Satisfy',
]

const FONT_OPTIONS = [
  { value: 'inherit', label: 'System Default', category: 'System' },
  { value: '"Roboto", sans-serif', label: 'Roboto', category: 'Google Fonts' },
  ...GOOGLE_FONTS.map(name => ({ value: `"${name}", sans-serif`, label: name, category: 'Google Fonts' })),
]

function formatTime(d) {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const DEFAULT_STYLE = {
  fontSize: 40,
  color: '#ffffff',
  fontFamily: 'inherit',
  bgColor: '#000000',
  bgImage: '', // object URL used for local preview only, never sent
  bgImageFile: null, // the actual File — this is what gets sent
}

const MAX_LEN = 280

const fileToBase64 = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1]) // strip data: prefix
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

// react-select styles wired to the MUI theme so it doesn't clash visually.
function buildSelectStyles(theme) {
  return {
    control: (base, state) => ({
      ...base,
      minHeight: 40,
      backgroundColor: 'transparent',
      borderColor: state.isFocused ? theme.palette.primary.main : theme.palette.divider,
      boxShadow: 'none',
      '&:hover': { borderColor: theme.palette.primary.main },
    }),
    menu: base => ({
      ...base,
      backgroundColor: theme.palette.background.paper,
      zIndex: 20,
    }),
    menuList: base => ({ ...base, maxHeight: 320 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? alpha(theme.palette.primary.main, 0.16)
        : state.isFocused
        ? alpha(theme.palette.primary.main, 0.08)
        : 'transparent',
      color: theme.palette.text.primary,
      cursor: 'pointer',
    }),
    singleValue: base => ({ ...base, color: theme.palette.text.primary }),
    input: base => ({ ...base, color: theme.palette.text.primary }),
    placeholder: base => ({ ...base, color: theme.palette.text.secondary }),
    indicatorSeparator: base => ({ ...base, backgroundColor: theme.palette.divider }),
    dropdownIndicator: base => ({ ...base, color: theme.palette.text.secondary }),
  }
}

function FreeTextManager() {
  const theme = useTheme()
  const { send } = useSocket()
  const [draft, setDraft] = useState('')
  const [content, setContent] = useState('')
  const [publishedAt, setPublishedAt] = useState(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const webviewRef = useRef(null)

  const [draftStyle, setDraftStyle] = useState(DEFAULT_STYLE)
  const [style, setStyle] = useState(DEFAULT_STYLE)

  // Fonts are loaded lazily (only when the picker is opened), and only
  // once for the component's lifetime — see ensureFontsLoaded below.
  const fontsLoadedRef = useRef(false)
  const [fontsReady, setFontsReady] = useState(false)

  const isElectron = typeof window !== 'undefined' && !!window.process?.versions?.electron

  // Load Google Fonts on demand (webfontloader batches them into a single
  // stylesheet request), so options preview in their real typeface once
  // requested. WebFont.load() operates globally on `document` — it injects
  // <link> tags into <head> and toggles classes on <html>, not scoped to
  // this component — so this must NOT run unconditionally on every mount,
  // or navigating to this screen repeatedly re-triggers a global font
  // swap/reflow that can visibly flicker fonts elsewhere in the app.
  const ensureFontsLoaded = useCallback(() => {
    if (fontsLoadedRef.current) return
    fontsLoadedRef.current = true
    WebFont.load({
      google: { families: GOOGLE_FONTS },
      active: () => setFontsReady(true),
      inactive: () => setFontsReady(true),
    })
  }, [])

  // Revoke the preview object URL on unmount to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (draftStyle.bgImage) URL.revokeObjectURL(draftStyle.bgImage)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Memoized/callback-stable handlers to avoid unnecessary re-renders ----

  const updateDraftStyle = useCallback((key, value) => {
    setDraftStyle(prev => (prev[key] === value ? prev : { ...prev, [key]: value }))
  }, [])

  const handleDraftChange = useCallback(e => {
    setDraft(e.target.value.slice(0, MAX_LEN))
  }, [])

  const handleDiscardDraft = useCallback(() => setDraft(''), [])

  const handleFontSizeChange = useCallback(
    (_, v) => updateDraftStyle('fontSize', v),
    [updateDraftStyle]
  )

  const handleFontFamilyChange = useCallback(
    option => updateDraftStyle('fontFamily', option ? option.value : 'inherit'),
    [updateDraftStyle]
  )

  const handleTextColorInput = useCallback(
    e => updateDraftStyle('color', e.target.value),
    [updateDraftStyle]
  )

  const handleBgColorInput = useCallback(
    e => updateDraftStyle('bgColor', e.target.value),
    [updateDraftStyle]
  )

  const handleImageUpload = useCallback(
    e => {
      const file = e.target.files?.[0]
      if (!file) return
      // Revoke the previous object URL (if any) before creating a new one,
      // so we don't leak memory across repeated uploads.
      setDraftStyle(prev => {
        if (prev.bgImage) URL.revokeObjectURL(prev.bgImage)
        return { ...prev, bgImage: URL.createObjectURL(file), bgImageFile: file }
      })
    },
    []
  )

  const handleClearBgImage = useCallback(() => {
    setDraftStyle(prev => {
      if (prev.bgImage) URL.revokeObjectURL(prev.bgImage)
      return { ...prev, bgImage: '', bgImageFile: null }
    })
  }, [])

  const handleSubmit = useCallback(() => {
    if (!draft.trim()) return
    setContent(draft.trim())
    setStyle(draftStyle)
    setPublishedAt(new Date())
  }, [draft, draftStyle])

  const handleClear = useCallback(() => {
    setDraft('')
    setContent('')
    setPublishedAt(null)
    setSent(false)
    setSendError(false)
  }, [])

  const handleSend = useCallback(async () => {
    if (!content || sending) return
    setSending(true)
    setSendError(false)
    try {
      const bgImage = style.bgImageFile
        ? {
            data: await fileToBase64(style.bgImageFile),
            name: style.bgImageFile.name,
            type: style.bgImageFile.type,
          }
        : null

      await send({
        type: 'send_free_text',
        text: content,
        style: {
          fontSize: style.fontSize,
          color: style.color,
          fontFamily: style.fontFamily,
          bgColor: style.bgColor,
        },
        bgImage,
      })

      console.log('Free text sent successfully')
      setSent(true)
      setTimeout(() => setSent(false), 2000)
    } catch (e) {
      setSendError(true)
      setTimeout(() => setSendError(false), 2500)
    } finally {
      setSending(false)
    }
  }, [content, sending, send, style])

  const handleReload = useCallback(() => {
    if (webviewRef.current?.reload) {
      webviewRef.current.reload()
    } else {
      setReloadKey(k => k + 1)
    }
  }, [])

  const handleOpenWindow = useCallback(() => {
    if (window.electronAPI?.openDisplayWindow) {
      window.electronAPI.openDisplayWindow(DISPLAY_URL)
    } else {
      window.open(DISPLAY_URL, '_blank', 'noopener,noreferrer')
    }
  }, [])

  // ---- Memoized derived values ----

  const count = draft.length
  const isOverLimit = count >= MAX_LEN

  const countColor = useMemo(() => (isOverLimit ? 'error.main' : 'text.secondary'), [isOverLimit])

  const selectStyles = useMemo(() => buildSelectStyles(theme), [theme])

  const selectedFontOption = useMemo(
    () => FONT_OPTIONS.find(f => f.value === draftStyle.fontFamily) || FONT_OPTIONS[0],
    [draftStyle.fontFamily]
  )

  const formatFontOptionLabel = useCallback(
    option => <span style={{ fontFamily: option.value }}>{option.label}</span>,
    []
  )

  const previewBoxSx = useMemo(
    () => ({
      mx: { xs: 2.5, sm: 3 },
      mb: { xs: 2.5, sm: 3 },
      borderRadius: 2,
      overflow: 'hidden',
      border: 1,
      borderColor: 'divider',
      aspectRatio: { xs: '4 / 3', sm: '21 / 9' },
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      p: 3,
      textAlign: 'center',
      backgroundColor: draftStyle.bgColor,
      backgroundImage: draftStyle.bgImage ? `url(${draftStyle.bgImage})` : 'none',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }),
    [draftStyle.bgColor, draftStyle.bgImage]
  )

  const previewTextSx = useMemo(
    () => ({
      color: draftStyle.color,
      fontFamily: draftStyle.fontFamily,
      fontSize: draftStyle.fontSize,
      fontWeight: 700,
      lineHeight: 1.2,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      textShadow: draftStyle.bgImage ? '0 2px 8px rgba(0,0,0,0.6)' : 'none',
    }),
    [draftStyle.color, draftStyle.fontFamily, draftStyle.fontSize, draftStyle.bgImage]
  )

  const placeholderColor = useMemo(() => alpha(draftStyle.color, 0.4), [draftStyle.color])

  const statusLabel = useMemo(
    () => (content ? `Live · ${publishedAt ? formatTime(publishedAt) : ''}` : 'Preview'),
    [content, publishedAt]
  )

  const sendButtonLabel = sending ? 'Sending' : sent ? 'Sent' : sendError ? 'Retry' : 'Send'

  return (
    <Box sx={{ minHeight: '100%', bgcolor: 'background.default', py: { xs: 4, sm: 6 }, px: 2 }}>
      <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
          <CampaignOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', letterSpacing: '0.14em', fontWeight: 600, lineHeight: 1 }}
          >
            Free Text
          </Typography>
        </Stack>
        <Typography
          sx={{
            color: 'text.primary',
            fontFamily: theme.typography.h4.fontFamily,
            fontSize: { xs: 28, sm: 34 },
            fontWeight: 600,
            letterSpacing: '-0.01em',
            mb: 4,
          }}
        >
          Write something worth displaying.
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
            gap: 3,
          }}
        >
          {/* Top-left: content input */}
          <Box>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 }, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <Typography
                  variant="overline"
                  sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 600, lineHeight: 1 }}
                >
                  Content
                </Typography>
              </Stack>

              <TextField
                placeholder="Type your message…"
                multiline
                minRows={4}
                fullWidth
                variant="standard"
                value={draft}
                onChange={handleDraftChange}
                InputProps={{ disableUnderline: true }}
                sx={{ '& .MuiInputBase-input': { fontSize: 19, lineHeight: 1.55 } }}
              />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider',alignItems: 'center',justifyContent: 'space-between' }}
              >
                <Typography variant="caption" sx={{ color: countColor, fontVariantNumeric: 'tabular-nums' }}>
                  {count} / {MAX_LEN}
                </Typography>

                <Stack direction="row" spacing={1}>
                  {draft && (
                    <Button
                      onClick={handleDiscardDraft}
                      color="inherit"
                      sx={{ fontSize: 13, textTransform: 'none', fontWeight: 500 }}
                    >
                      Discard
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={!draft.trim()}
                    variant="contained"
                    disableElevation
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ fontSize: 13, fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 2, py: 0.75 }}
                  >
                    {content ? 'Save Changes' : 'Publish'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>
          </Box>

          {/* Top-right: appearance controls */}
          <Box>
            <Paper variant="outlined" sx={{ borderRadius: 3, p: { xs: 2.5, sm: 3 }, height: '100%' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                <TuneRoundedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                <Typography
                  variant="overline"
                  sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 600, lineHeight: 1 }}
                >
                  Appearance
                </Typography>
              </Stack>

              <Stack spacing={3}>
                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Font size ({draftStyle.fontSize}px)
                  </Typography>
                  <Slider
                    size="small"
                    min={16}
                    max={120}
                    value={draftStyle.fontSize}
                    onChange={handleFontSizeChange}
                  />
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Font style {fontsLoadedRef.current && !fontsReady && '(loading previews…)'}
                  </Typography>
                  <Select
                    options={FONT_OPTIONS}
                    value={selectedFontOption}
                    onChange={handleFontFamilyChange}
                    onMenuOpen={ensureFontsLoaded}
                    formatOptionLabel={formatFontOptionLabel}
                    styles={selectStyles}
                    isSearchable
                    placeholder="Search fonts…"
                    menuPlacement="auto"
                  />
                </Box>

                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Text color
                    </Typography>
                    <Box
                      component="input"
                      type="color"
                      value={draftStyle.color}
                      onInput={handleTextColorInput}
                      onChange={handleTextColorInput}
                      sx={{
                        width: '100%',
                        height: 40,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 0.5,
                        cursor: 'pointer',
                        bgcolor: 'transparent',
                      }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      Background color
                    </Typography>
                    <Box
                      component="input"
                      type="color"
                      value={draftStyle.bgColor}
                      onInput={handleBgColorInput}
                      onChange={handleBgColorInput}
                      sx={{
                        width: '100%',
                        height: 40,
                        border: 1,
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 0.5,
                        cursor: 'pointer',
                        bgcolor: 'transparent',
                      }}
                    />
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Background image
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button
                      component="label"
                      variant="outlined"
                      color="inherit"
                      startIcon={<ImageRoundedIcon sx={{ fontSize: 17 }} />}
                      sx={{ fontSize: 13, textTransform: 'none', flex: 1 }}
                    >
                      Upload
                      <input hidden type="file" accept="image/*" onChange={handleImageUpload} />
                    </Button>
                    {draftStyle.bgImage && (
                      <Button
                        onClick={handleClearBgImage}
                        color="inherit"
                        sx={{ fontSize: 13, textTransform: 'none' }}
                      >
                        Clear
                      </Button>
                    )}
                  </Stack>
                </Box>
              </Stack>
            </Paper>
          </Box>

          {/* Below: preview (full width) */}
          <Box sx={{ gridColumn: { xs: '1', md: '1 / -1' } }}>
            <Paper
              variant="outlined"
              sx={{
                borderRadius: 3,
                overflow: 'hidden',
                bgcolor: theme => alpha(theme.palette.primary.main, 0.04),
                mb: 3,
              }}
            >
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: content ? 'primary.main' : 'text.disabled',
                    }}
                  />
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 600, lineHeight: 1 }}
                  >
                    {statusLabel}
                  </Typography>
                </Stack>

                {content && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title="Remove">
                      <IconButton onClick={handleClear} size="small" color="inherit">
                        <DeleteOutlineRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Button
                      onClick={handleSend}
                      disabled={sending}
                      variant="contained"
                      color={sendError ? 'error' : 'primary'}
                      disableElevation
                      size="small"
                      startIcon={
                        sending ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : sent ? (
                          <CheckRoundedIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <SendRoundedIcon sx={{ fontSize: 15 }} />
                        )
                      }
                      sx={{ ml: 1, fontSize: 12.5, fontWeight: 700, textTransform: 'none', borderRadius: 2, px: 1.5 }}
                    >
                      {sendButtonLabel}
                    </Button>
                  </Stack>
                )}
              </Stack>

              {/* Local style preview — updates live as draft text/appearance change */}
              <Box sx={previewBoxSx}>
                {draft.trim() ? (
                  <Typography sx={previewTextSx}>{draft}</Typography>
                ) : (
                  <Typography sx={{ color: placeholderColor, fontSize: 14 }}>
                    Start typing to see your message here
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Embedded live preview of the actual display page */}
            {content && (
              <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  sx={{ px: { xs: 2.5, sm: 3 }, pt: { xs: 2.5, sm: 3 }, pb: 1.5 }}
                >
                  <Typography
                    variant="overline"
                    sx={{ color: 'text.secondary', letterSpacing: '0.12em', fontWeight: 600, lineHeight: 1 }}
                  >
                    On Display
                  </Typography>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Reload preview">
                      <IconButton onClick={handleReload} size="small" color="inherit">
                        <RefreshRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Open on display">
                      <IconButton onClick={handleOpenWindow} size="small" color="inherit">
                        <OpenInNewRoundedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
                <Box
                  sx={{
                    mx: { xs: 2.5, sm: 3 },
                    mb: { xs: 2.5, sm: 3 },
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: 1,
                    borderColor: 'divider',
                    aspectRatio: '16 / 9',
                    bgcolor: '#000',
                  }}
                >
                  {isElectron ? (
                    // eslint-disable-next-line react/no-unknown-property
                    <webview
                      key={reloadKey}
                      ref={webviewRef}
                      src={DISPLAY_URL}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  ) : (
                    <iframe
                      key={reloadKey}
                      ref={webviewRef}
                      title="Free text display preview"
                      src={DISPLAY_URL}
                      style={{ width: '100%', height: '100%', border: 'none' }}
                    />
                  )}
                </Box>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}

export default FreeTextManager