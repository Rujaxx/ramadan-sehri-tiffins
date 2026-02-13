"use client";

import { useState, useEffect } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users, Truck, UserPlus, X, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";

interface AreaStats {
    area: string;
    totalTiffins: number;
    newUsers: number;
    volunteers: string[];
}

interface Volunteer {
    id: string;
    name: string;
    phone: string;
    areas: string[];
}

interface AreaBreakdownTableProps {
    data: AreaStats[];
}

export function AreaBreakdownTable({ data }: AreaBreakdownTableProps) {
    const [allVolunteers, setAllVolunteers] = useState<Volunteer[]>([]);
    const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
    const [selectedArea, setSelectedArea] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const grandTotalTiffins = data.reduce((sum, row) => sum + row.totalTiffins, 0);
    const grandTotalNewUsers = data.reduce((sum, row) => sum + row.newUsers, 0);

    const fetchVolunteers = async () => {
        try {
            const res = await fetch("/api/admin/volunteers");
            if (res.ok) {
                const data = await res.json();
                setAllVolunteers(data.volunteers);
            }
        } catch (error) {
            console.error("Failed to fetch volunteers");
        }
    };

    const handleToggleAssignment = async (volunteerId: string, areaName: string, currentlyAssigned: boolean) => {
        setIsUpdating(true);
        try {
            const res = await fetch("/api/admin/volunteers", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    volunteerId,
                    areaName,
                    action: currentlyAssigned ? "unassign" : "assign"
                })
            });

            if (res.ok) {
                toast.success(currentlyAssigned ? "Unassigned successfully" : "Assigned successfully");
                await fetchVolunteers();
            } else {
                toast.error("Failed to update assignment");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-2xl font-black gradient-text">Area-Wise Distribution</h3>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">Ground Logistics & Volunteer Assignments</p>
                </div>
            </div>

            {data.length === 0 ? (
                <div className="p-8 text-center glass border border-white/5 rounded-2xl">
                    <p className="text-zinc-500">No area data available yet.</p>
                </div>
            ) : (
                <>
                    {/* Desktop Table */}
                    <div className="hidden md:block rounded-[2rem] border border-white/5 overflow-hidden glass">
                        <Table>
                            <TableHeader className="bg-white/5">
                                <TableRow className="hover:bg-transparent border-white/5">
                                    <TableHead className="font-bold py-5 pl-8">Area Sector</TableHead>
                                    <TableHead className="font-bold text-center">Tiffins</TableHead>
                                    <TableHead className="font-bold text-center">Growth</TableHead>
                                    <TableHead className="font-bold">Team Members</TableHead>
                                    <TableHead className="font-bold text-right pr-8">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.map((row) => (
                                    <TableRow key={row.area} className="hover:bg-white/5 border-white/5 group">
                                        <TableCell className="font-black pl-8">{row.area}</TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="px-3 py-1 bg-emerald-500/10 text-emerald-400 border-none font-bold">
                                                {row.totalTiffins}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border-none font-bold">
                                                +{row.newUsers}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {row.volunteers.length > 0 ? (
                                                    row.volunteers.map((v) => (
                                                        <Badge key={v} variant="outline" className="border-white/10 text-white bg-white/5 text-[10px] font-medium">
                                                            {v}
                                                        </Badge>
                                                    ))
                                                ) : (
                                                    <span className="text-[10px] text-zinc-600 font-bold uppercase tracking-tighter">No assignment</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <button
                                                onClick={() => {
                                                    setSelectedArea(row.area);
                                                    fetchVolunteers();
                                                    setIsAssignmentModalOpen(true);
                                                }}
                                                className="p-2 rounded-xl bg-white/5 border border-white/10 text-zinc-400 hover:text-white hover:bg-emerald-500/20 hover:border-emerald-500/30 transition-all"
                                                title="Assign Volunteers"
                                            >
                                                <UserPlus className="h-4 w-4" />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                <TableRow className="bg-white/10 font-bold hover:bg-white/10 border-none">
                                    <TableCell className="pl-8 py-4 uppercase tracking-[0.2em] text-xs font-black">Grand Total</TableCell>
                                    <TableCell className="text-center text-lg font-black tabular-nums">{grandTotalTiffins}</TableCell>
                                    <TableCell className="text-center text-lg font-black tabular-nums">{grandTotalNewUsers}</TableCell>
                                    <TableCell colSpan={2}></TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {data.map((row) => (
                            <div key={row.area} className="premium-card space-y-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-xl font-bold">{row.area}</h4>
                                    <button
                                        onClick={() => {
                                            setSelectedArea(row.area);
                                            fetchVolunteers();
                                            setIsAssignmentModalOpen(true);
                                        }}
                                        className="p-2 rounded-xl bg-white/5 border border-white/10"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1 p-3 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-center">
                                        <p className="text-lg font-black text-emerald-400">{row.totalTiffins}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase">Tiffins</p>
                                    </div>
                                    <div className="flex-1 p-3 rounded-2xl bg-cyan-500/5 border border-cyan-500/10 text-center">
                                        <p className="text-lg font-black text-cyan-400">+{row.newUsers}</p>
                                        <p className="text-[10px] text-zinc-500 font-bold uppercase">New</p>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Assigned Team</p>
                                    <div className="flex flex-wrap gap-2">
                                        {row.volunteers.map((v) => (
                                            <Badge key={v} variant="outline" className="text-xs border-white/10 text-white bg-white/5">
                                                {v}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Assignment Modal */}
            {isAssignmentModalOpen && selectedArea && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-br from-emerald-500/5 to-transparent">
                            <div>
                                <h3 className="text-2xl font-black text-white">Assign Delivery Team</h3>
                                <p className="text-xs text-zinc-500 font-bold uppercase">Area: {selectedArea}</p>
                            </div>
                            <button
                                onClick={() => setIsAssignmentModalOpen(false)}
                                className="p-2 rounded-full bg-white/5 text-zinc-500 hover:text-white transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 max-h-[50vh] overflow-y-auto space-y-3 custom-scrollbar">
                            {allVolunteers.length === 0 ? (
                                <div className="py-8 text-center text-zinc-500">
                                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 opacity-20" />
                                    No volunteers registered yet.
                                </div>
                            ) : (
                                allVolunteers.map(v => {
                                    const isAssigned = v.areas.includes(selectedArea);
                                    return (
                                        <button
                                            key={v.id}
                                            disabled={isUpdating}
                                            onClick={() => handleToggleAssignment(v.id, selectedArea, isAssigned)}
                                            className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isAssigned
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                                                : "bg-white/5 border-white/5 text-zinc-400 hover:bg-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            <div className="text-left">
                                                <p className="font-black leading-tight">{v.name}</p>
                                                <p className="text-[10px] opacity-70">{v.phone}</p>
                                            </div>
                                            {isAssigned ? (
                                                <div className="h-6 w-6 rounded-full bg-emerald-500 text-black flex items-center justify-center">
                                                    <Check className="h-4 w-4 font-black" />
                                                </div>
                                            ) : (
                                                <div className="h-6 w-6 rounded-full border border-white/20" />
                                            )}
                                        </button>
                                    );
                                })
                            )}
                        </div>

                        <div className="p-6 bg-white/5 border-t border-white/5">
                            <button
                                onClick={() => setIsAssignmentModalOpen(false)}
                                className="w-full py-4 bg-white/10 text-white font-black rounded-2xl hover:bg-white/20 transition-all active:scale-95"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
