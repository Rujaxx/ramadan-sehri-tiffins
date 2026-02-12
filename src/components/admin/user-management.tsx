"use client";

import { useState, useEffect } from "react";
import {
    Search,
    UserX,
    UserCheck,
    Edit2,
    ShieldAlert,
    SearchX,
    Loader2,
    Utensils,
    Phone,
    MapPin,
    Check
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface User {
    id: string;
    name: string;
    phone: string;
    area: string;
    address: string;
    blocked: boolean;
    verified: boolean;
    bookings: {
        tiffinCount: number;
    }[];
}

export function UserManagement({ token, defaultFilter }: { token: string | null, defaultFilter?: boolean | null }) {
    const [query, setQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [newTiffinCount, setNewTiffinCount] = useState<number>(0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [filterVerified, setFilterVerified] = useState<boolean | null>(null);

    useEffect(() => {
        if (defaultFilter !== undefined) {
            setFilterVerified(defaultFilter);
        }
    }, [defaultFilter]);

    const fetchUsers = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/admin/users?query=${query}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users);
            }
        } catch (error) {
            toast.error("Failed to fetch users");
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleBlock = async (user: User) => {
        const action = user.blocked ? "unblock" : "block";
        if (!confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id, blocked: !user.blocked })
            });

            if (res.ok) {
                toast.success(`User ${action}ed successfully`);
                fetchUsers();
            } else {
                toast.error("Failed to update user status");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleVerify = async (user: User) => {
        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId: user.id, verified: true })
            });

            if (res.ok) {
                toast.success(`${user.name} verified successfully`);
                fetchUsers();
            } else {
                toast.error("Failed to verify user");
            }
        } catch (error) {
            toast.error("An error occurred");
        }
    };

    const handleUpdateTiffins = async () => {
        if (!editingUser) return;
        setIsUpdating(true);

        try {
            const res = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ userId: editingUser.id, tiffinCount: newTiffinCount })
            });

            if (res.ok) {
                toast.success("Tiffin count updated");
                setEditingUser(null);
                fetchUsers();
            } else {
                toast.error("Failed to update tiffin count");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Card className="glass border-white/5 rounded-3xl overflow-hidden">
            <CardHeader className="pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-2xl font-black gradient-text flex items-center gap-2">
                            <ShieldAlert className="h-6 w-6 text-amber-400" />
                            User Control Center
                        </CardTitle>
                        <CardDescription className="text-[10px] leading-tight mb-2">
                            Search, edit tiffin counts, or block problematic numbers instantly.
                        </CardDescription>
                        <div className="p-2 bg-emerald-500/5 rounded-lg border border-emerald-500/10 mb-2">
                            <p className="text-[10px] text-emerald-400 font-bold leading-tight">
                                💡 TIP: Editing tiffins here updates the user's permanent "Base Plan".
                                Blocked users are immediately logged out and cannot re-access the app.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                            <input
                                type="text"
                                placeholder="Search name or phone..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            />
                        </div>
                        <select
                            value={filterVerified === null ? "all" : filterVerified.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterVerified(val === "all" ? null : val === "true");
                            }}
                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs font-bold text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                        >
                            <option value="all">Priority: All Users</option>
                            <option value="false">Action: Pending Verification</option>
                            <option value="true">State: Verified Only</option>
                        </select>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-white/5">
                            <TableRow className="hover:bg-transparent border-white/5">
                                <TableHead className="font-bold">User Details</TableHead>
                                <TableHead className="font-bold">Primary Area</TableHead>
                                <TableHead className="font-bold text-center">Base Tiffins</TableHead>
                                <TableHead className="font-bold text-center">Status</TableHead>
                                <TableHead className="font-bold text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-emerald-500" />
                                        <p className="mt-2 text-zinc-500 text-sm">Searching our database...</p>
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <SearchX className="h-10 w-10 mx-auto text-zinc-700 mb-2" />
                                        <p className="text-zinc-500 font-medium">No users found matching "{query}"</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users
                                    .filter(user => filterVerified === null || user.verified === filterVerified)
                                    .map((user) => (
                                        <TableRow key={user.id} className="hover:bg-white/5 border-white/5 group">
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white">{user.name}</span>
                                                    <span className="text-xs text-zinc-500 flex items-start gap-1 break-all">
                                                        <Phone className="h-3 w-3 shrink-0 mt-0.5" />
                                                        {user.phone}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-zinc-400">
                                                    <MapPin className="h-3.5 w-3.5" />
                                                    <span className="text-sm font-medium">{user.area}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-xl text-sm font-bold">
                                                    <Utensils className="h-3.5 w-3.5" />
                                                    {user.bookings[0]?.tiffinCount || 0}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {user.blocked ? (
                                                    <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/30 rounded-lg">
                                                        Blocked
                                                    </Badge>
                                                ) : user.verified ? (
                                                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 rounded-lg">
                                                        Verified
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/30 rounded-lg">
                                                        Pending
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {!user.verified && !user.blocked && (
                                                        <button
                                                            onClick={() => handleVerify(user)}
                                                            className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all font-bold text-[10px] flex items-center gap-1 px-3"
                                                            title="Verify User"
                                                        >
                                                            <Check className="h-3 w-3" /> VERIFY
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => {
                                                            setEditingUser(user);
                                                            setNewTiffinCount(user.bookings[0]?.tiffinCount || 0);
                                                        }}
                                                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                                                        title="Edit Tiffins"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleBlock(user)}
                                                        className={`p-2 rounded-xl border transition-all ${user.blocked
                                                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                                                            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                                                            }`}
                                                        title={user.blocked ? "Unblock User" : "Block User"}
                                                    >
                                                        {user.blocked ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            {/* Simple Edit Modal Overlay */}
            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <Card className="w-full max-w-sm premium-card border-emerald-500/30 bg-zinc-950 animate-in fade-in zoom-in duration-200">
                        <CardHeader>
                            <CardTitle className="text-xl font-black">Edit Tiffins</CardTitle>
                            <CardDescription>Updating {editingUser.name}'s daily delivery.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Daily Tiffin Quantity</label>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setNewTiffinCount(Math.max(0, newTiffinCount - 1))}
                                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold hover:bg-white/10"
                                    >
                                        -
                                    </button>
                                    <div className="flex-1 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-black">
                                        {newTiffinCount}
                                    </div>
                                    <button
                                        onClick={() => setNewTiffinCount(newTiffinCount + 1)}
                                        className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl font-bold hover:bg-white/10"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setEditingUser(null)}
                                    className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUpdateTiffins}
                                    disabled={isUpdating}
                                    className="flex-1 py-3 rounded-2xl bg-emerald-500 text-black font-black shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                                >
                                    {isUpdating ? "Saving..." : "Save Count"}
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </Card>
    );
}
