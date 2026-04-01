import { useState } from 'react';
import { Camera, MapPin, Calendar, Settings, Heart, Zap, DollarSign } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { Slider } from '../components/ui/slider';
import { ScrollArea } from '../components/ui/scroll-area';
import { mockUsers, mockTrips } from '../data/mockData';

export default function Profile() {
  const currentUser = mockUsers[0];
  const userTrips = mockTrips;

  const [pace, setPace] = useState(currentUser.preferences.pace);
  const [budgetLevel, setBudgetLevel] = useState(currentUser.preferences.budgetLevel);
  const [favoriteCategories, setFavoriteCategories] = useState(
    currentUser.preferences.favoriteCategories
  );

  const allCategories = ['Ẩm Thực', 'Văn Hóa', 'Lịch Sử', 'Phiêu Lưu', 'Thiên Nhiên', 'Nhiếp Ảnh', 'Mua Sắm', 'Nghỉ Dưỡng', 'Giải Trí', 'Địa Phương'];

  const toggleCategory = (category: string) => {
    if (favoriteCategories.includes(category)) {
      setFavoriteCategories(favoriteCategories.filter((c) => c !== category));
    } else {
      setFavoriteCategories([...favoriteCategories, category]);
    }
  };

  const paceLabels = ['Thư Giãn', 'Thoải Mái', 'Trung Bình', 'Năng Động', 'Mạnh Mẽ'];
  const budgetLabels = ['Tiết Kiệm', 'Trung Bình', 'Cao Cấp'];

  return (
    <div className="h-screen bg-slate-50">
      <ScrollArea className="h-full">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Profile Header */}
          <Card className="overflow-hidden shadow-lg">
            <div className="h-32 bg-gradient-to-r from-[#0A4A6E] via-[#0d5d8a] to-[#0A4A6E]" />
            <div className="px-6 pb-6">
              <div className="flex items-end justify-between -mt-16 mb-4">
                <div className="relative">
                  <Avatar className="w-32 h-32 border-4 border-white shadow-xl ring-4 ring-[#FF6B35]/20">
                    <AvatarImage src={currentUser.avatar} />
                    <AvatarFallback>{currentUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 rounded-full bg-[#FF6B35] hover:bg-[#ff7d4d] shadow-lg"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </div>
                <Button variant="outline" className="mb-4 border-[#0A4A6E] text-[#0A4A6E] hover:bg-[#0A4A6E] hover:text-white">
                  <Settings className="w-4 h-4 mr-2" />
                  Chỉnh Sửa Hồ Sơ
                </Button>
              </div>

              <div className="mb-4">
                <h1 className="text-3xl font-bold text-[#0A4A6E] mb-1">{currentUser.name}</h1>
                <p className="text-slate-600">{currentUser.email}</p>
              </div>

              <div className="flex gap-6 text-center">
                <div>
                  <p className="text-2xl font-bold text-[#0A4A6E]">{userTrips.length}</p>
                  <p className="text-sm text-slate-600">Chuyến Đi</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-[#0A4A6E]">15</p>
                  <p className="text-sm text-slate-600">Tỉnh Thành</p>
                </div>
                <div className="w-px bg-slate-200" />
                <div>
                  <p className="text-2xl font-bold text-[#0A4A6E]">87</p>
                  <p className="text-sm text-slate-600">Địa Điểm</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Travel Preferences */}
          <Card className="p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <Heart className="w-5 h-5 text-[#FF6B35]" />
              <h2 className="text-xl font-bold text-[#0A4A6E]">SỞ THÍCH DU LỊCH</h2>
            </div>

            <div className="space-y-8">
              {/* Travel Pace */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-[#0A4A6E]" />
                  <p className="font-semibold text-slate-700">Nhịp Độ Du Lịch</p>
                </div>
                <div className="mb-2">
                  <Slider
                    value={[pace]}
                    onValueChange={(value) => setPace(value[0])}
                    min={1}
                    max={5}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  {paceLabels.map((label, i) => (
                    <span
                      key={label}
                      className={`${pace === i + 1 ? 'text-[#0A4A6E] font-bold' : ''}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Budget Level */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-[#0A4A6E]" />
                  <p className="font-semibold text-slate-700">Mức Ngân Sách</p>
                </div>
                <div className="mb-2">
                  <Slider
                    value={[budgetLevel]}
                    onValueChange={(value) => setBudgetLevel(value[0])}
                    min={1}
                    max={3}
                    step={1}
                    className="w-full"
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  {budgetLabels.map((label, i) => (
                    <span
                      key={label}
                      className={`${budgetLevel === i + 1 ? 'text-[#0A4A6E] font-bold' : ''}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Favorite Categories */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Heart className="w-4 h-4 text-[#FF6B35]" />
                  <p className="font-semibold text-slate-700">Danh Mục Yêu Thích</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((category) => {
                    const isSelected = favoriteCategories.includes(category);
                    return (
                      <Badge
                        key={category}
                        className={`cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#FF6B35] hover:bg-[#ff7d4d] text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        onClick={() => toggleCategory(category)}
                      >
                        {isSelected && '✓ '}
                        {category}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <Button className="w-full bg-[#0A4A6E] hover:bg-[#0d5d8a]">
                Lưu Sở Thích
              </Button>
            </div>
          </Card>

          {/* Past Trips */}
          <Card className="p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-[#0A4A6E]" />
              <h2 className="text-xl font-bold text-[#0A4A6E]">CHUYẾN ĐI CỦA TÔI</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userTrips.map((trip) => (
                <Card
                  key={trip.id}
                  className="overflow-hidden hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-[#FF6B35]"
                >
                  <div className="relative h-40">
                    <img
                      src={trip.coverImage}
                      alt={trip.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="font-bold text-white text-lg mb-1">{trip.name}</h3>
                      <div className="flex items-center gap-2 text-white/90 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span>{trip.destination}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar className="w-4 h-4" />
                        <span>
                          {new Date(trip.startDate).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <Badge className="bg-[#0A4A6E]/10 text-[#0A4A6E] hover:bg-[#0A4A6E]/20">
                        {trip.participants.length} người
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}
