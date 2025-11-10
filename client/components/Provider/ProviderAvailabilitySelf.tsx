import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { X } from "lucide-react";

interface Props {
  providerId: string;
  onClose: () => void;
}

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ProviderAvailabilitySelf({ providerId, onClose }: Props) {
  const { toast } = useToast();
  const [businessHours, setBusinessHours] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("authToken") || "";

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/providers/${providerId}/availability`);
        if (r.ok) {
          const data = await r.json();
            setBusinessHours(data.businessHours || defaultHours());
            setBlockedDates(data.blockedDates || []);
        } else {
          setBusinessHours(defaultHours());
        }
      } catch {
        setBusinessHours(defaultHours());
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [providerId]);

  const defaultHours = () => [
    { dayOfWeek: 0, startTime:"00:00", endTime:"00:00", isOpen:false },
    { dayOfWeek: 1, startTime:"09:00", endTime:"17:00", isOpen:true },
    { dayOfWeek: 2, startTime:"09:00", endTime:"17:00", isOpen:true },
    { dayOfWeek: 3, startTime:"09:00", endTime:"17:00", isOpen:true },
    { dayOfWeek: 4, startTime:"09:00", endTime:"17:00", isOpen:true },
    { dayOfWeek: 5, startTime:"09:00", endTime:"17:00", isOpen:true },
    { dayOfWeek: 6, startTime:"00:00", endTime:"00:00", isOpen:false }
  ];

  const changeHour = (idx:number,key:string,val:any)=>{
    setBusinessHours(h=>{
      const copy=[...h]; copy[idx]={...copy[idx],[key]:val}; return copy;
    });
  };

  const addBlocked = ()=>{
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates(d=>[...d,newBlockedDate]); setNewBlockedDate("");
    }
  };
  const removeBlocked=(d:string)=> setBlockedDates(b=>b.filter(x=>x!==d));

  const save = async ()=>{
    try {
      const r = await fetch(`/api/providers/${providerId}/availability`,{
        method:"PATCH",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body: JSON.stringify({ providerId, businessHours, blockedDates })
      });
      if(!r.ok) throw new Error();
      toast({ title:"Saved", description:"Availability updated" });
      onClose();
    } catch {
      toast({ title:"Error", description:"Failed to save availability", variant:"destructive"});
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto border-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Availability</CardTitle>
            <CardDescription>Adjust working hours & blocked dates</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0"><X className="h-4 w-4"/></Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading ? <p className="text-muted-foreground text-sm">Loading...</p> : (
            <>
              <div className="space-y-2">
                {businessHours.map((h,idx)=>(
                  <div key={idx} className="flex items-center gap-3 text-sm">
                    <label className="flex items-center gap-2 min-w-20">
                      <input
                        type="checkbox"
                        checked={h.isOpen}
                        onChange={e=>changeHour(idx,"isOpen",e.target.checked)}
                        className="rounded border-border"
                      />
                      <span>{DAYS[h.dayOfWeek]}</span>
                    </label>
                    {h.isOpen && (
                      <>
                        <Input type="time" value={h.startTime} onChange={e=>changeHour(idx,"startTime",e.target.value)} className="w-24"/>
                        <span>to</span>
                        <Input type="time" value={h.endTime} onChange={e=>changeHour(idx,"endTime",e.target.value)} className="w-24"/>
                      </>
                    )}
                  </div>
                ))}
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Blocked Dates</p>
                <div className="flex gap-2 mb-2">
                  <Input type="date" value={newBlockedDate} onChange={e=>setNewBlockedDate(e.target.value)} className="flex-1"/>
                  <Button variant="outline" size="sm" onClick={addBlocked}>Add</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {blockedDates.map(d=>(
                    <span key={d} className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs flex items-center gap-2">
                      {new Date(d).toLocaleDateString()}
                      <button onClick={()=>removeBlocked(d)}>×</button>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90 text-white" onClick={save}>Save</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
