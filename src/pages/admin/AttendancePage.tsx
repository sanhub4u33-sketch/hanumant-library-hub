import { useState, useMemo } from 'react';
import { 
  Calendar,
  Clock,
  User,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMembers, useAttendance } from '@/hooks/useFirebaseData';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';

const AttendancePage = () => {
  const { members } = useMembers();
  const { attendance, getMonthlyAttendance, getMemberAttendance } = useAttendance();
  const [selectedMember, setSelectedMember] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const filteredAttendance = useMemo(() => {
    let filtered = attendance;
    
    if (selectedMember !== 'all') {
      filtered = getMemberAttendance(selectedMember);
    }

    const monthStr = format(currentMonth, 'yyyy-MM');
    filtered = filtered.filter(record => record.date?.startsWith(monthStr));

    if (searchQuery) {
      filtered = filtered.filter(record =>
        record.memberName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [attendance, selectedMember, currentMonth, searchQuery]);

  const getMemberAttendanceForDay = (memberId: string, date: Date) => {
    return attendance.find(record => 
      record.memberId === memberId && 
      isSameDay(parseISO(record.date), date)
    );
  };

  const selectedMemberData = selectedMember !== 'all' 
    ? members.find(m => m.id === selectedMember) 
    : null;

  const totalDaysPresent = selectedMember !== 'all'
    ? new Set(getMemberAttendance(selectedMember)
        .filter(r => r.date.startsWith(format(currentMonth, 'yyyy-MM')))
        .map(r => r.date)
      ).size
    : 0;

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const printAttendance = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const title = selectedMember === 'all' 
      ? `All Members Attendance - ${format(currentMonth, 'MMMM yyyy')}`
      : `${selectedMemberData?.name} Attendance - ${format(currentMonth, 'MMMM yyyy')}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .present { color: green; }
            .absent { color: red; }
          </style>
        </head>
        <body>
          <h1>Shri Hanumant Library</h1>
          <h2>${title}</h2>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Member</th>
                <th>Entry Time</th>
                <th>Exit Time</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              ${filteredAttendance.map(record => `
                <tr>
                  <td>${format(parseISO(record.date), 'dd MMM yyyy')}</td>
                  <td>${record.memberName}</td>
                  <td>${record.entryTime}</td>
                  <td>${record.exitTime || '-'}</td>
                  <td>${record.duration ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m` : '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <AdminLayout 
      title="Attendance" 
      searchPlaceholder="Search by name..."
      onSearch={setSearchQuery}
    >
      {/* Filters */}
      <div className="card-elevated p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="px-4 py-2 bg-secondary rounded-lg min-w-[180px] text-center">
              <span className="font-medium">{format(currentMonth, 'MMMM yyyy')}</span>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 min-w-[200px]">
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger>
                <SelectValue placeholder="Select member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Members</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={printAttendance} className="gap-2">
            <Download className="w-4 h-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Individual Member Calendar View */}
      {selectedMember !== 'all' && selectedMemberData && (
        <div className="card-elevated p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full hero-gradient flex items-center justify-center text-primary-foreground font-bold">
                {selectedMemberData.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-display text-xl font-semibold">{selectedMemberData.name}</h3>
                <p className="text-muted-foreground">{selectedMemberData.email}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{totalDaysPresent}</p>
              <p className="text-sm text-muted-foreground">Days Present</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="p-2" />
            ))}

            {daysInMonth.map((day) => {
              const record = getMemberAttendanceForDay(selectedMember, day);
              const isPresent = !!record;
              const isToday = isSameDay(day, new Date());

              return (
                <div
                  key={day.toISOString()}
                  className={`p-2 rounded-lg text-center text-sm ${
                    isPresent 
                      ? 'bg-success/20 text-success' 
                      : 'bg-secondary/50 text-muted-foreground'
                  } ${isToday ? 'ring-2 ring-primary' : ''}`}
                >
                  <span className="font-medium">{format(day, 'd')}</span>
                  {record && (
                    <p className="text-xs mt-1">{record.entryTime.slice(0, 5)}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Attendance Records Table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Member</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Entry Time</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Exit Time</th>
                <th className="text-left p-4 font-medium text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No attendance records found
                  </td>
                </tr>
              ) : (
                filteredAttendance.map((record) => (
                  <tr key={record.id} className="border-b border-border hover:bg-secondary/30">
                    <td className="p-4">{format(parseISO(record.date), 'dd MMM yyyy')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-medium">
                          {record.memberName.charAt(0)}
                        </div>
                        {record.memberName}
                      </div>
                    </td>
                    <td className="p-4 text-success">{record.entryTime}</td>
                    <td className="p-4">{record.exitTime || <span className="text-warning">In Library</span>}</td>
                    <td className="p-4">
                      {record.duration 
                        ? `${Math.floor(record.duration / 60)}h ${record.duration % 60}m`
                        : '-'
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AttendancePage;
