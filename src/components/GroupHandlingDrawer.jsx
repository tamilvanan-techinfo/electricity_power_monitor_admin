import React, { useEffect, useState, useCallback } from "react";
import CustomeDrawer from "./CustomeDrawer";

import {
  Box,
  Typography,
  TextField,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Alert,
  CircularProgress,
  Paper,
  Stack,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Check";
import api from "../config.json"
const API_BASE = api.apiBase+"/api";
const PARTICIPANT_CYCLES_URL = `${API_BASE}/admin/participant-cycles/`;
const GROUP_URL = `${API_BASE}/group/`; // adjust to match your actual group endpoint path

function GroupHandlingDrawer({ open, onClose }) {
  const [participantCycles, setParticipantCycles] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // create-group form state
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);

  // rename state per group
  const [renameDrafts, setRenameDrafts] = useState({});

  // move-to select state per member
  const [moveDrafts, setMoveDrafts] = useState({});

  // add-participant select state per group
  const [addDrafts, setAddDrafts] = useState({});

  const fetchParticipantCycles = useCallback(async () => {
    try {
      const res = await fetch(PARTICIPANT_CYCLES_URL);
      const json = await res.json();
      if (json.status) {
        setParticipantCycles(json.data || []);
      } else {
        setError(json.message || "Failed to fetch participant cycles.");
      }
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const res = await fetch(GROUP_URL);
      const json = await res.json();
      setGroups(Array.isArray(json) ? json : []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    await Promise.all([fetchParticipantCycles(), fetchGroups()]);
    setLoading(false);
  }, [fetchParticipantCycles, fetchGroups]);

  useEffect(() => {
    if (open) {
      loadAll();
    }
  }, [open, loadAll]);

  // ---- helpers ----
  const allocatedCycleIds = new Set(
    groups.flatMap((g) => g.members.map((m) => m.id))
  );

  const toggleSelectMember = (id) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ---- API actions ----
  const createGroup = async () => {
    if (!newGroupName.trim()) {
      setError("Group name is required.");
      return;
    }
    
    try {
      const res = await fetch(GROUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          member_ids: selectedMemberIds,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to create group.");
        return;
      }
      setNewGroupName("");
      setSelectedMemberIds([]);
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const renameGroup = async (groupId) => {
    const name = renameDrafts[groupId];
    if (!name || !name.trim()) return;
    try {
      const res = await fetch(GROUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId, name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to rename group.");
        return;
      }
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeMember = async (groupId, cycleId) => {
    try {
      const res = await fetch(GROUP_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId, cycle_id: cycleId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to remove member.");
        return;
      }
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const moveMember = async (fromGroupId, targetGroupId, cycleId) => {
    if (!targetGroupId || targetGroupId === fromGroupId) return;
    try {
      const res = await fetch(GROUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          group_id: fromGroupId,
          target_group_id: targetGroupId,
          cycle_id: cycleId,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to move member.");
        return;
      }
      setMoveDrafts((prev) => ({ ...prev, [cycleId]: "" }));
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const addMember = async (groupId, cycleId) => {
    if (!cycleId) return;
    try {
      const res = await fetch(GROUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId, cycle_id: cycleId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to add participant.");
        return;
      }
      setAddDrafts((prev) => ({ ...prev, [groupId]: "" }));
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      const res = await fetch(GROUP_URL, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group_id: groupId }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Failed to delete group.");
        return;
      }
      await fetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <CustomeDrawer open={open} onClose={onClose} title="Group Handling">
      <Box sx={{ p: 2, width: { xs: 320, sm: 420 } }}>
        <Stack spacing={3}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              {/* ---- Create Group ---- */}
              <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Create New Group
                </Typography>

                <TextField
                  fullWidth
                  size="small"
                  label="Group name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  sx={{ mb: 2 }}
                />

                <Paper
                  variant="outlined"
                  sx={{ maxHeight: 224, overflowY: "auto", mb: 2 }}
                >
                  <List dense disablePadding>
                    {participantCycles.map((pc) => {
                      const alreadyAllocated = allocatedCycleIds.has(pc.id);
                      return (
                        <ListItem
                          key={pc.id}
                          divider
                          disablePadding
                          sx={{ opacity: alreadyAllocated ? 0.5 : 1, px: 1 }}
                          secondaryAction={
                            <Typography variant="caption" color="text.secondary">
                              {pc.power}W
                            </Typography>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox
                              edge="start"
                              size="small"
                              checked={selectedMemberIds.includes(pc.id)}
                              onChange={() => toggleSelectMember(pc.id)}
                              disabled={alreadyAllocated}
                            />
                          </ListItemIcon>
                          <ListItemText
                            primary={`${pc.participent_name} — Cycle ${pc.cycle_no} / Ctrl ${pc.controller_no}`}
                            secondary={alreadyAllocated ? "Allocated" : null}
                            primaryTypographyProps={{ fontSize: 13 }}
                            secondaryTypographyProps={{ fontSize: 11 }}
                          />
                        </ListItem>
                      );
                    })}
                    {participantCycles.length === 0 && (
                      <ListItem>
                        <ListItemText
                          primary="No participant cycles found."
                          primaryTypographyProps={{
                            fontSize: 13,
                            color: "text.disabled",
                          }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>

                <Button fullWidth variant="contained" onClick={createGroup}>
                  Create Group ({selectedMemberIds.length} selected)
                </Button>
              </Paper>

              {/* ---- Existing Groups ---- */}
              <Box>
                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                  Existing Groups
                </Typography>

                {groups.length === 0 && (
                  <Typography variant="body2" color="text.disabled">
                    No groups yet.
                  </Typography>
                )}

                <Stack spacing={2}>
                  {groups.map((group) => (
                    <Paper key={group.id} variant="outlined" sx={{ p: 2 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <TextField
                          size="small"
                          fullWidth
                          defaultValue={group.name}
                          onChange={(e) =>
                            setRenameDrafts((prev) => ({
                              ...prev,
                              [group.id]: e.target.value,
                            }))
                          }
                        />
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => renameGroup(group.id)}
                          title="Save name"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteGroup(group.id)}
                          title="Delete group"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Stack>

                      <Divider sx={{ mb: 1 }} />

                      <List dense disablePadding>
                        {group.members.map((member) => (
                          <ListItem
                            key={member.id}
                            divider
                            disablePadding
                            sx={{ py: 1, alignItems: "center" }}
                          >
                            <ListItemText
                              primary={`${member.participent_name} — Cycle ${member.cycle_no} / Ctrl ${member.controller_no}`}
                              secondary={`${member.power}W`}
                              primaryTypographyProps={{ fontSize: 13 }}
                              secondaryTypographyProps={{ fontSize: 11 }}
                              sx={{ mr: 1 }}
                            />

                            <FormControl size="small" sx={{ minWidth: 110, mr: 1 }}>
                              <InputLabel id={`move-label-${member.id}`}>
                                Move to
                              </InputLabel>
                              <Select
                                labelId={`move-label-${member.id}`}
                                label="Move to"
                                value={moveDrafts[member.id] || ""}
                                onChange={(e) => {
                                  const targetId = Number(e.target.value);
                                  setMoveDrafts((prev) => ({
                                    ...prev,
                                    [member.id]: e.target.value,
                                  }));
                                  moveMember(group.id, targetId, member.id);
                                }}
                              >
                                {groups
                                  .filter((g) => g.id !== group.id)
                                  .map((g) => (
                                    <MenuItem key={g.id} value={g.id}>
                                      {g.name}
                                    </MenuItem>
                                  ))}
                              </Select>
                            </FormControl>

                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeMember(group.id, member.id)}
                              title="Remove member"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </ListItem>
                        ))}
                        {group.members.length === 0 && (
                          <ListItem>
                            <ListItemText
                              primary="No members in this group."
                              primaryTypographyProps={{
                                fontSize: 12,
                                color: "text.disabled",
                              }}
                            />
                          </ListItem>
                        )}
                      </List>

                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
                        <FormControl size="small" fullWidth>
                          <InputLabel id={`add-label-${group.id}`}>
                            Add participant
                          </InputLabel>
                          <Select
                            labelId={`add-label-${group.id}`}
                            label="Add participant"
                            value={addDrafts[group.id] || ""}
                            onChange={(e) =>
                              setAddDrafts((prev) => ({
                                ...prev,
                                [group.id]: e.target.value,
                              }))
                            }
                          >
                            {participantCycles
                              .filter((pc) => !allocatedCycleIds.has(pc.id))
                              .map((pc) => (
                                <MenuItem key={pc.id} value={pc.id}>
                                  {pc.participent_name} — Cycle {pc.cycle_no} /
                                  Ctrl {pc.controller_no}
                                </MenuItem>
                              ))}
                            {participantCycles.filter(
                              (pc) => !allocatedCycleIds.has(pc.id)
                            ).length === 0 && (
                              <MenuItem value="" disabled>
                                No unallocated participants
                              </MenuItem>
                            )}
                          </Select>
                        </FormControl>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!addDrafts[group.id]}
                          onClick={() =>
                            addMember(group.id, Number(addDrafts[group.id]))
                          }
                        >
                          Add
                        </Button>
                      </Stack>

                      <Box sx={{ mt: 1.5 }}>
                        <Chip
                          size="small"
                          label={`${group.members.length} member${
                            group.members.length !== 1 ? "s" : ""
                          }`}
                        />
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </>
          )}
        </Stack>
      </Box>
    </CustomeDrawer>
  );
}

export default GroupHandlingDrawer;