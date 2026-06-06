import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OptimizedSitePreview({ business, onClose, theme = 'dark' }) {
  const isDark = theme === 'dark';
  const name = business?.name || 'Lush Cafe';
  
  // States
  const [activeCategory, setActiveCategory] = useState('all');
  const [dietaryFilter, setDietaryFilter] = useState({
    halal: false,
    vegetarian: false,
    glutenFree: false,
  });

  // Booking Form State
  const [booking, setBooking] = useState({
    date: '',
    time: '19:00',
    guests: '2',
    seating: 'standard',
    name: '',
    email: '',
    submitted: false,
  });

  // Catering Form State
  const [catering, setCatering] = useState({
    name: '',
    email: '',
    date: '',
    guests: '20',
    package: 'buffet',
    message: '',
    submitted: false,
  });

  const menuItems = [
    { name: 'Traditional Tandoori Chai', price: '$4.50', category: 'beverages', halal: true, vegetarian: true, glutenFree: true, desc: 'Brewed in clay pots with live coal smoke infusion for an authentic, rich taste.' },
    { name: 'Pistachio Spanish Latte', price: '$6.25', category: 'beverages', halal: true, vegetarian: true, glutenFree: true, desc: 'Premium espresso blended with sweet condensed milk and organic pistachio paste.' },
    { name: 'Hummus & Warm Pita', price: '$8.99', category: 'appetizers', halal: true, vegetarian: true, glutenFree: false, desc: 'House-made creamy chickpea blend topped with virgin olive oil, served with fresh clay oven bread.' },
    { name: 'Crispy Falafel Bites', price: '$7.49', category: 'appetizers', halal: true, vegetarian: true, glutenFree: true, desc: 'Spiced ground fava beans fried golden-brown, served with tahini garlic dip.' },
    { name: 'Spiced Beef Shawarma Wrap', price: '$13.99', category: 'mains', halal: true, vegetarian: false, glutenFree: false, desc: 'Slow-roasted spit beef wrapped in pita with garlic sauce, pickles, and red onions.' },
    { name: 'Charred Chicken Boti Plate', price: '$16.99', category: 'mains', halal: true, vegetarian: false, glutenFree: true, desc: 'Flame-grilled marinated chicken skewers served with saffron rice and spicy mint chutney.' },
    { name: 'Al Taj Loaded Burger', price: '$14.99', category: 'mains', halal: true, vegetarian: false, glutenFree: false, desc: 'Premium ground beef patty with melting cheese, fried egg, and zinger sauce on brioche.' },
    { name: 'Loaded Dynamite Fries', price: '$9.99', category: 'appetizers', halal: true, vegetarian: true, glutenFree: true, desc: 'Golden fries drenched in cheese, spicy mayo sauce, and scallions.' }
  ];

  const filteredItems = menuItems.filter(item => {
    if (activeCategory !== 'all' && item.category !== activeCategory) return false;
    if (dietaryFilter.halal && !item.halal) return false;
    if (dietaryFilter.vegetarian && !item.vegetarian) return false;
    if (dietaryFilter.glutenFree && !item.glutenFree) return false;
    return true;
  });

  const handleBook = (e) => {
    e.preventDefault();
    setBooking(prev => ({ ...prev, submitted: true }));
    setTimeout(() => {
      setBooking(prev => ({ ...prev, submitted: false, name: '', email: '', date: '' }));
    }, 4000);
  };

  const handleCatering = (e) => {
    e.preventDefault();
    setCatering(prev => ({ ...prev, submitted: true }));
    setTimeout(() => {
      setCatering(prev => ({ ...prev, submitted: false, name: '', email: '', date: '', message: '' }));
    }, 4000);
  };

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${isDark ? 'bg-zinc-950 text-white' : 'bg-gray-50 text-gray-900'} scroll-smooth`}>
      {/* Concept Header Toolbar */}
      <div className="sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-hookline-600 text-white shadow-md">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-300"></span>
          </span>
          <span className="text-xs font-mono font-bold uppercase tracking-wider">HookLine Web Optimizer — Concept Live Preview</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 bg-black/30 hover:bg-black/55 text-sm font-semibold rounded-full transition"
        >
          Return to Dashboard
        </button>
      </div>

      {/* Main Website Header */}
      <nav className={`border-b ${isDark ? 'bg-zinc-900/95 border-zinc-800' : 'bg-white/95 border-gray-200'} sticky top-[44px] z-40 backdrop-blur`}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-hookline-500 flex items-center justify-center text-white font-black text-lg">L</div>
            <span className="font-extrabold text-xl tracking-tight">{name}</span>
          </div>
          <div className="hidden md:flex gap-6 text-sm font-medium">
            <a href="#vibe" className="hover:text-hookline-500 transition">Our Vibe</a>
            <a href="#menu" className="hover:text-hookline-500 transition">Menu</a>
            <a href="#book" className="hover:text-hookline-500 transition">Book Table</a>
            <a href="#catering" className="hover:text-hookline-500 transition">Catering</a>
            <a href="#reviews" className="hover:text-hookline-500 transition">Reviews</a>
          </div>
          <a
            href="#book"
            className="px-5 py-2 bg-hookline-500 hover:bg-hookline-600 text-white text-sm font-bold rounded-full transition"
          >
            Reserve Online
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative py-24 px-4 overflow-hidden border-b border-zinc-800/20 dark:border-zinc-800/80 bg-gradient-to-br from-hookline-950/10 via-transparent to-transparent">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="px-3 py-1 bg-hookline-500/10 border border-hookline-500/20 text-hookline-400 text-xs font-bold uppercase tracking-widest rounded-full">
            Specialty Coffee · Live BBQ · Hookah Lounge
          </span>
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight mt-6 mb-6 leading-tight">
            Vibe Dining, Welcoming Spaces &{' '}
            <span className="bg-gradient-to-r from-hookline-400 to-sky-400 bg-clip-text text-transparent">
              Culturally Authentic Tastes
            </span>
          </h1>
          <p className="text-lg max-w-2xl mx-auto text-zinc-400 mb-10">
            Welcome to {name}. An inviting third-space in Houston featuring specialty hand-brewed coffee, charcoal-grilled Mediterranean BBQ, and a cozy outdoor patio.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a
              href="#book"
              className="px-8 py-3.5 bg-hookline-500 hover:bg-hookline-600 text-white font-bold rounded-xl transition shadow-lg shadow-hookline-500/25 text-center"
            >
              Book Table Reservation
            </a>
            <a
              href="#catering"
              className={`px-8 py-3.5 font-bold rounded-xl transition border text-center ${isDark ? 'border-zinc-700 hover:bg-zinc-900 text-white' : 'border-gray-300 hover:bg-gray-100 text-gray-800'}`}
            >
              Explore Catering Options
            </a>
          </div>
        </div>
      </header>

      {/* Visual Showcase (Our Vibe) */}
      <section id="vibe" className="py-20 max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Experience Our Vibe</h2>
          <p className="text-zinc-400 max-w-xl mx-auto">Take a visual tour of what makes us the perfect local hangout spot.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: 'The Live BBQ Smokehouse', desc: 'Charcoal-grilled meats and kebabs prepped daily.', img: '🔥' },
            { title: 'Cozy Indoors & Workspace', desc: 'Plugs, fast Wi-Fi, and specialty brews for remote work.', img: '☕' },
            { title: 'Kids Play Zone', desc: 'Secure indoor play area where children are safe and happy.', img: '🧸' },
            { title: 'Hookah Lounge & Patio', desc: 'Suburban Houston escape for relaxed evening gatherings.', img: '💨' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`rounded-2xl border p-6 flex flex-col items-center text-center transition hover:scale-[1.02] ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200 shadow-sm'}`}
            >
              <div className="h-16 w-16 bg-hookline-500/10 rounded-2xl flex items-center justify-center text-3xl mb-4">{item.img}</div>
              <h3 className="font-bold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-zinc-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Menu with Filters */}
      <section id="menu" className={`py-20 border-t ${isDark ? 'border-zinc-900 bg-zinc-950/30' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Our Curated Menu</h2>
            <p className="text-zinc-400">Fresh ingredients, premium spices, and handcrafted recipes.</p>
          </div>

          {/* Menu Categories */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {['all', 'beverages', 'appetizers', 'mains'].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition ${
                  activeCategory === cat
                    ? 'bg-hookline-500 text-white'
                    : isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dietary Filters */}
          <div className={`p-4 rounded-xl border mb-10 flex flex-wrap gap-4 items-center justify-center ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Dietary Preferences:</span>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={dietaryFilter.halal}
                onChange={(e) => setDietaryFilter(prev => ({ ...prev, halal: e.target.checked }))}
                className="rounded text-hookline-500 focus:ring-hookline-500 h-4 w-4 bg-zinc-950 border-zinc-700"
              />
              Halal-certified
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={dietaryFilter.vegetarian}
                onChange={(e) => setDietaryFilter(prev => ({ ...prev, vegetarian: e.target.checked }))}
                className="rounded text-hookline-500 focus:ring-hookline-500 h-4 w-4 bg-zinc-950 border-zinc-700"
              />
              Vegetarian
            </label>
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={dietaryFilter.glutenFree}
                onChange={(e) => setDietaryFilter(prev => ({ ...prev, glutenFree: e.target.checked }))}
                className="rounded text-hookline-500 focus:ring-hookline-500 h-4 w-4 bg-zinc-950 border-zinc-700"
              />
              Gluten-Free
            </label>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[300px]">
            <AnimatePresence mode="popLayout">
              {filteredItems.map((item) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                  key={item.name}
                  className={`p-5 rounded-2xl border flex flex-col justify-between ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-[#f5f5f7]/50 border-gray-200'}`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg leading-tight">{item.name}</h3>
                      <span className="font-extrabold text-hookline-500 ml-4">{item.price}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mb-3">{item.desc}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {item.halal && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-green-500/10 text-green-400 border border-green-500/20">Halal</span>}
                    {item.vegetarian && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">Veg</span>}
                    {item.glutenFree && <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">Gluten-Free</span>}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {filteredItems.length === 0 && (
              <div className="col-span-full py-16 text-center text-zinc-500 font-mono text-sm">
                No menu items match selected filter options.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Online Reservation Widget */}
      <section id="book" className="py-20 max-w-6xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-hookline-500">Live Booking Portal</span>
            <h2 className="text-3xl sm:text-4xl font-extrabold mt-3 mb-6">Book Your Table</h2>
            <p className="text-zinc-400 mb-6 leading-relaxed">
              Skip the queue! Reserve your table instantly for lunch or evening dinner. Planning a family meal? Request seating near our **Kids Play Zone** or out on our cozy **Hookah Patio**.
            </p>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                <span className="text-sm font-medium text-zinc-300">Instant confirmation via email</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs">✓</span>
                <span className="text-sm font-medium text-zinc-300">Choose seating preferences (Patio, Indoor, Kids Play area)</span>
              </div>
            </div>
          </div>

          <div className={`p-8 rounded-3xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur' : 'bg-white border-gray-200 shadow-md'}`}>
            <AnimatePresence mode="wait">
              {!booking.submitted ? (
                <form onSubmit={handleBook} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Date</label>
                      <input
                        type="date"
                        required
                        value={booking.date}
                        onChange={(e) => setBooking(prev => ({ ...prev, date: e.target.value }))}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Time</label>
                      <select
                        value={booking.time}
                        onChange={(e) => setBooking(prev => ({ ...prev, time: e.target.value }))}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                      >
                        <option value="11:00">11:00 AM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                        <option value="19:00">7:00 PM</option>
                        <option value="21:00">9:00 PM</option>
                        <option value="23:00">11:00 PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Guests</label>
                      <select
                        value={booking.guests}
                        onChange={(e) => setBooking(prev => ({ ...prev, guests: e.target.value }))}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                      >
                        <option value="1">1 Person</option>
                        <option value="2">2 People</option>
                        <option value="4">4 People</option>
                        <option value="6">6 People</option>
                        <option value="10">10+ People</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Seating Area</label>
                      <select
                        value={booking.seating}
                        onChange={(e) => setBooking(prev => ({ ...prev, seating: e.target.value }))}
                        className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                      >
                        <option value="standard">Standard Indoor</option>
                        <option value="patio">Hookah Patio</option>
                        <option value="play-zone">Near Kids Play Zone</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={booking.name}
                      onChange={(e) => setBooking(prev => ({ ...prev, name: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="john@example.com"
                      value={booking.email}
                      onChange={(e) => setBooking(prev => ({ ...prev, email: e.target.value }))}
                      className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-hookline-500 hover:bg-hookline-600 text-white font-bold rounded-xl transition shadow-lg shadow-hookline-500/25 mt-2"
                  >
                    Confirm Table Booking
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12 space-y-4"
                >
                  <div className="h-16 w-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto">🎉</div>
                  <h3 className="text-2xl font-bold">Booking Confirmed!</h3>
                  <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                    Thanks, {booking.name}! Your reservation for {booking.guests} guests on {booking.date} at {booking.time} is successfully booked.
                  </p>
                  <p className="text-xs text-hookline-400">A confirmation email has been sent to {booking.email}.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Catering Inquiry Portal */}
      <section id="catering" className={`py-20 border-t ${isDark ? 'border-zinc-900 bg-zinc-950/30' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className={`p-8 rounded-3xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800 backdrop-blur' : 'bg-white border-gray-200 shadow-md'}`}>
                <AnimatePresence mode="wait">
                  {!catering.submitted ? (
                    <form onSubmit={handleCatering} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                          <input
                            type="text"
                            required
                            placeholder="John Doe"
                            value={catering.name}
                            onChange={(e) => setCatering(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
                          <input
                            type="email"
                            required
                            placeholder="john@example.com"
                            value={catering.email}
                            onChange={(e) => setCatering(prev => ({ ...prev, email: e.target.value }))}
                            className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Event Date</label>
                          <input
                            type="date"
                            required
                            value={catering.date}
                            onChange={(e) => setCatering(prev => ({ ...prev, date: e.target.value }))}
                            className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Guest Count</label>
                          <input
                            type="number"
                            required
                            min="10"
                            value={catering.guests}
                            onChange={(e) => setCatering(prev => ({ ...prev, guests: e.target.value }))}
                            className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Catering Package</label>
                        <select
                          value={catering.package}
                          onChange={(e) => setCatering(prev => ({ ...prev, package: e.target.value }))}
                          className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        >
                          <option value="buffet">Mediterranean Buffet Spread</option>
                          <option value="chai-station">Live Tandoori Chai Pop-up Station</option>
                          <option value="hookah-patio">Charcoal BBQ & Hookah Event Package</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Special Notes / Requirements</label>
                        <textarea
                          placeholder="Tell us about your event (allergies, custom menu requests...)"
                          value={catering.message}
                          onChange={(e) => setCatering(prev => ({ ...prev, message: e.target.value }))}
                          rows={3}
                          className={`w-full mt-1 px-3 py-2 rounded-lg border outline-none resize-none ${isDark ? 'bg-zinc-950 border-zinc-700 text-white' : 'bg-gray-50 border-gray-300 text-gray-900'}`}
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 bg-hookline-500 hover:bg-hookline-600 text-white font-bold rounded-xl transition shadow-lg shadow-hookline-500/25 mt-2"
                      >
                        Submit Catering Request
                      </button>
                    </form>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12 space-y-4"
                    >
                      <div className="h-16 w-16 bg-green-500/10 border border-green-500/20 text-green-400 rounded-full flex items-center justify-center text-3xl mx-auto">📨</div>
                      <h3 className="text-2xl font-bold">Inquiry Received!</h3>
                      <p className="text-sm text-zinc-400 max-w-xs mx-auto">
                        Thanks, {catering.name}! Our events coordinator will review your request for {catering.guests} guests and get back to you within 24 hours.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <span className="text-xs font-bold uppercase tracking-wider text-hookline-500">Catering & Events</span>
              <h2 className="text-3xl sm:text-4xl font-extrabold mt-3 mb-6">Premium Catering Packages</h2>
              <p className="text-zinc-400 mb-8 leading-relaxed">
                Hosting a wedding, private gathering, or corporate function in Houston? Let {name} handle the hospitality. We offer fully customizable spreads, live tandoori chai stations, and smokehouse setups.
              </p>

              {/* Package cards */}
              <div className="space-y-4">
                {[
                  { name: 'Mediterranean Buffet Spread', desc: 'A rich assortment of shawarmas, falafel, charbroiled chicken boti, hummus, and saffron rice.' },
                  { name: 'Live Tandoori Chai Station', desc: 'Interactive, smoking clay-pot chai brewing setup that serves as a visual and social centerpiece.' },
                  { name: 'Smokehouse BBQ Event Package', desc: 'Dedicated pits prepped on-site with live charcoal fire serving juicy skewered botis and wraps.' }
                ].map((pkg, idx) => (
                  <div key={idx} className={`p-4 rounded-xl border flex gap-4 ${isDark ? 'bg-zinc-900/40 border-zinc-800' : 'bg-white border-gray-200'}`}>
                    <span className="text-hookline-500 font-extrabold text-lg shrink-0">0{idx + 1}</span>
                    <div>
                      <h3 className="font-bold text-sm mb-1">{pkg.name}</h3>
                      <p className="text-xs text-zinc-400">{pkg.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof (Reviews Showcase) */}
      <section id="reviews" className="py-20 max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">Loved by Local Foodies</h2>
          <p className="text-zinc-400">See what our customers have to say about our drinks, BBQ, and environment.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { name: 'Ayesha Khan', rating: '⭐⭐⭐⭐⭐', text: 'The tandoori chai is an absolute showstopper! It smells smoky and tastes incredible. Finally, a suburban third-space that stays open late and is halal-friendly!' },
            { name: 'Marcus Miller', rating: '⭐⭐⭐⭐⭐', text: 'Awesome Philly cheesesteaks and loaded dynamite fries. The kids play area is a lifesaver for family dinners. Highly recommend the outdoor patio!' },
            { name: 'Sarah Al-Sayed', rating: '⭐⭐⭐⭐⭐', text: 'The chicken boti is perfectly charred and juicy. Fast service, friendly staff, and the mocktails are amazing. 10/10 vibe!' },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl border ${isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-gray-200 shadow-sm'}`}
            >
              <div className="text-sm text-yellow-500 mb-3">{item.rating}</div>
              <p className="text-sm italic text-zinc-300 mb-6 leading-relaxed">&ldquo;{item.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-hookline-500/20 text-hookline-400 flex items-center justify-center font-bold text-xs">
                  {item.name[0]}
                </div>
                <div>
                  <h4 className="text-sm font-bold">{item.name}</h4>
                  <span className="text-[10px] text-zinc-500">Houston Local</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className={`py-12 border-t text-center text-xs text-zinc-500 ${isDark ? 'border-zinc-900 bg-black' : 'border-gray-200 bg-gray-100'}`}>
        <p className="mb-2">© {new Date().getFullYear()} {name}. All rights reserved.</p>
        <p className="text-[10px]">Optimized Standalone Concepts Powered by HookLine AI.</p>
      </footer>
    </div>
  );
}
