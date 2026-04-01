import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, Lock, User, Chrome, Apple } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card } from '../components/ui/card';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock authentication - in real app, this would call an API
    navigate('/');
  };

  const handleSocialLogin = (provider: string) => {
    // Mock social login
    console.log(`Login with ${provider}`);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0A4A6E] via-[#0d5d8a] to-[#0A4A6E] p-4">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-20 left-20 w-64 h-64 bg-[#FF6B35]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute bottom-20 right-20 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 shadow-2xl backdrop-blur-sm bg-white/95">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="text-5xl mb-4"
            >
              🇻🇳
            </motion.div>
            <h1 className="text-3xl font-bold text-[#0A4A6E] mb-2">
              {isLogin ? 'Chào Mừng Trở Lại' : 'Tham Gia VIETJOURNEY'}
            </h1>
            <p className="text-slate-600">
              {isLogin ? 'Đăng nhập để tiếp tục hành trình' : 'Bắt đầu lên kế hoạch chuyến đi mơ ước'}
            </p>
          </div>

          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 hover:bg-slate-50"
              onClick={() => handleSocialLogin('Google')}
            >
              <Chrome className="w-5 h-5 mr-2" />
              Tiếp Tục Với Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 hover:bg-slate-50"
              onClick={() => handleSocialLogin('Apple')}
            >
              <Apple className="w-5 h-5 mr-2" />
              Tiếp Tục Với Apple
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-slate-500">Hoặc tiếp tục với email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Label htmlFor="name" className="text-slate-700">
                  Họ Và Tên
                </Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Nguyễn Văn A"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10 h-12"
                    required={!isLogin}
                  />
                </div>
              </motion.div>
            )}

            <div>
              <Label htmlFor="email" className="text-slate-700">
                Địa Chỉ Email
              </Label>
              <div className="relative mt-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-slate-700">
                Mật Khẩu
              </Label>
              <div className="relative mt-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex items-center justify-end">
                <Button variant="link" className="text-[#FF6B35] hover:text-[#ff7d4d] p-0 h-auto">
                  Quên mật khẩu?
                </Button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-[#0A4A6E] hover:bg-[#0d5d8a] text-white font-semibold"
            >
              {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
            </Button>
          </form>

          {/* Toggle Login/Signup */}
          <div className="mt-6 text-center">
            <p className="text-slate-600">
              {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
              <Button
                variant="link"
                className="text-[#FF6B35] hover:text-[#ff7d4d] p-0 h-auto font-semibold"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? 'Đăng ký' : 'Đăng nhập'}
              </Button>
            </p>
          </div>
        </Card>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-white/80 text-sm mt-6"
        >
          Bằng cách tiếp tục, bạn đồng ý với Điều khoản Dịch vụ và Chính sách Bảo mật của chúng tôi
        </motion.p>
      </motion.div>
    </div>
  );
}