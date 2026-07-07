"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Shield, UserCheck, UserX, MoreHorizontal, Pencil } from "lucide-react";
import { DataTable, type ColumnDef } from "@/components/shared/data-table";
import { useUsers, useUpdateUser, useCreateUser } from "@/lib/hooks/use-users";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_CFG: Record<string, { label: string; color: string }> = {
  ADMIN:   { label: "Admin",   color: "text-primary bg-primary/10 border-primary/20" },
  MANAGER: { label: "Manager", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  STAFF:   { label: "Staff",   color: "text-muted-foreground bg-muted border-border" },
};

export default function UsersPage() {
  const { data, isLoading } = useUsers();
  const updateUser = useUpdateUser();
  const createUser = useCreateUser();

  const users: User[] = useMemo(() => (data as User[] | undefined) ?? [], [data]);
  const activeCount = users.filter(u => u.isActive).length;

  const [roleTarget, setRoleTarget] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState("");

  const [editTarget, setEditTarget]   = useState<User | null>(null);
  const [editName, setEditName]       = useState("");
  const [editEmail, setEditEmail]     = useState("");

  const openEditUser = (u: User) => {
    setEditTarget(u);
    setEditName(u.name);
    setEditEmail(u.email);
  };

  const handleEditUser = () => {
    if (!editTarget || !editName.trim()) return;
    updateUser.mutate({ id: editTarget.id, data: { name: editName.trim() } }, { onSuccess: () => setEditTarget(null) });
  };

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName]       = useState("");
  const [inviteEmail, setInviteEmail]     = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteRole, setInviteRole]       = useState("STAFF");

  const handleToggleActive = (user: User) => {
    updateUser.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const openRoleDialog = (user: User) => {
    setRoleTarget(user);
    setSelectedRole(user.role);
  };

  const handleRoleChange = () => {
    if (!roleTarget || !selectedRole) return;
    updateUser.mutate({ id: roleTarget.id, data: { role: selectedRole } }, { onSuccess: () => setRoleTarget(null) });
  };

  const handleInvite = () => {
    if (!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim()) return;
    createUser.mutate(
      { name: inviteName.trim(), email: inviteEmail.trim(), password: invitePassword, role: inviteRole },
      { onSuccess: () => { setInviteOpen(false); setInviteName(""); setInviteEmail(""); setInvitePassword(""); setInviteRole("STAFF"); } }
    );
  };

  const columns = useMemo<ColumnDef<User>[]>(() => [
    {
      key: "name",
      header: "User",
      sortable: true,
      getValue: u => u.name,
      cell: u => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {u.name.split(" ").map(w => w[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{u.name}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      getValue: u => u.role,
      cell: u => {
        const cfg = ROLE_CFG[u.role] ?? { label: u.role, color: "" };
        return <Badge variant="outline" className={`text-[10px] h-5 px-1.5 ${cfg.color}`}>{cfg.label}</Badge>;
      },
    },
    {
      key: "isActive",
      header: "Status",
      sortable: true,
      getValue: u => String(u.isActive),
      cell: u => (
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`} />
          <span className="text-xs text-muted-foreground">{u.isActive ? "Active" : "Inactive"}</span>
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      sortable: true,
      getValue: u => u.createdAt,
      cell: u => <span className="text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("en-IN")}</span>,
    },
    {
      key: "_actions",
      header: "",
      cell: u => (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => e.stopPropagation()} />}>
            <MoreHorizontal size={13} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => openEditUser(u)}>
              <Pencil size={12} /> Edit Name
            </DropdownMenuItem>
            <DropdownMenuItem className="text-xs gap-2 cursor-pointer" onClick={() => openRoleDialog(u)}>
              <Shield size={12} /> Change Role
            </DropdownMenuItem>
            <DropdownMenuItem
              className={`text-xs gap-2 cursor-pointer ${u.isActive ? "text-destructive focus:text-destructive" : "text-emerald-500 focus:text-emerald-500"}`}
              onClick={() => handleToggleActive(u)}
            >
              {u.isActive ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [updateUser]);

  return (
    <div className="space-y-5">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{activeCount} active users</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setInviteOpen(true)}>
          <Plus size={14} /> Invite User
        </Button>
      </motion.div>

      {/* Role summary */}
      <div className="grid grid-cols-3 gap-3">
        {["ADMIN", "MANAGER", "STAFF"].map((role, i) => {
          const cfg = ROLE_CFG[role];
          const count = users.filter(u => u.role === role).length;
          return (
            <motion.div key={role} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.06 }}>
              <Card className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg border ${cfg.color}`}><Shield size={16} /></div>
                <div>
                  <p className="text-xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{cfg.label}{count !== 1 ? "s" : ""}</p>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <DataTable<User>
            columns={columns}
            data={users}
            rowKey={u => u.id}
            clientSide
            isLoading={isLoading}
            initialPageSize={20}
            searchPlaceholder="Search users…"
            emptyMessage="No users found."
          />
        </Card>
      </motion.div>

      {/* Change Role dialog */}
      <Dialog open={!!roleTarget} onOpenChange={o => !o && setRoleTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Update role for <span className="font-semibold text-foreground">{roleTarget?.name}</span>
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs">New Role</Label>
            <Select value={selectedRole} onValueChange={v => { if (v) setSelectedRole(v); }}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setRoleTarget(null)}>Cancel</Button>

            <Button
              className="flex-1"
              disabled={!selectedRole || updateUser.isPending}
              onClick={handleRoleChange}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name *</Label>
              <Input className="text-sm" placeholder="John Doe" value={inviteName} onChange={e => setInviteName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email *</Label>
              <Input className="text-sm" type="email" placeholder="john@example.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Password *</Label>
              <Input className="text-sm" type="password" placeholder="Min. 8 characters" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Role</Label>
              <Select value={inviteRole} onValueChange={v => { if (v) setInviteRole(v); }}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="MANAGER">Manager</SelectItem>
                  <SelectItem value="STAFF">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button
                className="flex-1"
                disabled={!inviteName.trim() || !inviteEmail.trim() || !invitePassword.trim() || createUser.isPending}
                onClick={handleInvite}
              >
                Create User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit name dialog */}
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs">Full Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email (read-only)</Label>
              <Input value={editEmail} disabled className="text-sm opacity-60" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-8" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button className="flex-1 h-8" disabled={!editName.trim() || updateUser.isPending} onClick={handleEditUser}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
