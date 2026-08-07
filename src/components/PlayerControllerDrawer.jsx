import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  TextField,
  Chip,
  Autocomplete,
  Button,
  Divider,
  Stack,
  Alert,
  CircularProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import TuneIcon from '@mui/icons-material/Tune'

const WS_URL = (() => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${"127.0.0.1:8000"}/ws/power-monitor/admin/`
})()

const ACTIVE_PARTICIPENT_URL = 'http://127.0.0.1:8000/screens/active-participent/'
const PARTICIPENT_CYCLE_URL = 'http://127.0.0.1:8000/screens/participent-cycle/'

/**
 * PlayerControllerDrawer
 *
 * Admin-only control panel. On open it:
 *   1. Loads the current config from /screens/active-participent/
 *      ({ duration, cycles }) to prefill the form.
 *   2. Loads /screens/participent-cycle/ and derives the list of
 *      distinct cycle numbers to offer in the "Cycles" picker, along
 *      with which participants belong to each cycle (shown as a hint).
 *   3. Opens the admin websocket and pushes { minutes, cycles } updates,
 *      which the consumer writes into ActiveParticipent for every
 *      connected client to pick up on its next poll tick.
 */
function PlayerControllerDrawer({ open, onClose }) {
  const socketRef = useRef(null)

  const [connected, setConnected] = useState(false)
  const [minutes, setMinutes] = useState('')
  const [cycles, setCycles] = useState([])
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', message }

  const [loading, setLoading] = useState(false)
  const [cycleOptions, setCycleOptions] = useState([])
  const [participantsByCycle, setParticipantsByCycle] = useState({})

  // Load current config + available cycles whenever the drawer opens.
  useEffect(() => {
    if (!open) return undefined

    let cancelled = false
    setLoading(true)
    setFeedback(null)

    Promise.all([
      fetch(ACTIVE_PARTICIPENT_URL).then((res) => res.json()),
      fetch(PARTICIPENT_CYCLE_URL).then((res) => res.json()),
    ])
      .then(([activeConfig, participantCycles]) => {
        if (cancelled) return

        setMinutes(String(activeConfig?.duration ?? ''))
        setCycles(activeConfig?.cycles ?? [])

        const grouped = {}
        ;(participantCycles ?? []).forEach((row) => {
          if (!row?.cycle) return
          if (!grouped[row.cycle]) grouped[row.cycle] = []
          grouped[row.cycle].push(row.name)
        })
        setParticipantsByCycle(grouped)
        setCycleOptions(Object.keys(grouped).sort())
      })
      .catch(() => {
        if (!cancelled) {
          setFeedback({ type: 'error', message: 'Could not load current settings.' })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open])

  // Open the admin websocket while the drawer is open.
  useEffect(() => {
    if (!open) return undefined

    const socket = new WebSocket(WS_URL)
    socketRef.current = socket

    socket.onopen = () => setConnected(true)
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)

    socket.onmessage = (event) => {
      let payload
      try {
        payload = JSON.parse(event.data)
      } catch {
        return
      }

      if (payload.type === 'config_updated') {
        setSaving(false)
        setMinutes(String(payload.minutes ?? ''))
        setCycles(payload.cycles ?? [])
        setFeedback({ type: 'success', message: 'Settings updated.' })
      }

      if (payload.type === 'error') {
        setSaving(false)
        setFeedback({ type: 'error', message: payload.message || 'Something went wrong.' })
      }
    }

    return () => {
      socket.close()
      socketRef.current = null
    }
  }, [open])

  const handleSave = useCallback(() => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setFeedback({ type: 'error', message: 'Not connected yet — try again in a moment.' })
      return
    }

    const parsedMinutes = Number(minutes)
    if (!minutes || Number.isNaN(parsedMinutes) || parsedMinutes <= 0) {
      setFeedback({ type: 'error', message: 'Enter a whole number of minutes.' })
      return
    }

    setSaving(true)
    setFeedback(null)
    socket.send(
      JSON.stringify({
        minutes: Math.round(parsedMinutes),
        cycles,
      }),
    )
  }, [minutes, cycles])

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 340, p: 3 }} role="presentation">
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <TuneIcon fontSize="small" color="action" />
            <Typography variant="h6">Live view controls</Typography>
          </Stack>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: connected ? 'success.main' : 'grey.400',
            }}
          />
          <Typography variant="caption" color="text.secondary">
            {connected ? 'Connected' : 'Connecting…'}
          </Typography>
        </Stack>

        <Divider sx={{ mb: 3 }} />

        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 6 }}>
            <CircularProgress size={28} />
          </Stack>
        ) : (
          <Stack spacing={3}>
            <TextField
              label="Window (minutes)"
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              inputProps={{ min: 1, max: 1440 }}
              helperText="How far back the chart looks, e.g. 10 = last 10 minutes"
              fullWidth
            />

            <Autocomplete
              multiple
              options={cycleOptions}
              value={cycles}
              onChange={(_, value) => setCycles(value)}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                ))
              }
              renderOption={(props, option) => (
                <li {...props} key={option}>
                  <Stack>
                    <Typography variant="body2">{`Cycle ${option}`}</Typography>
                    {participantsByCycle[option]?.length ? (
                      <Typography variant="caption" color="text.secondary">
                        {participantsByCycle[option].join(', ')}
                      </Typography>
                    ) : null}
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Cycles"
                  placeholder={cycles.length ? '' : 'All cycles'}
                  helperText="Leave empty to include every cycle"
                />
              )}
            />

            {feedback && (
              <Alert severity={feedback.type} onClose={() => setFeedback(null)}>
                {feedback.message}
              </Alert>
            )}

            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!connected || saving}
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  )
}

export default PlayerControllerDrawer