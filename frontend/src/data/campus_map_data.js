// BIT Sathyamangalam Campus Map Data & Navigation Graph

export const MAP_DIMENSIONS = {
  width: 2280,
  height: 2584,
  viewBox: "0 0 3420 3876",
  scaleRatioX: 3420 / 2280, // 1.5
  scaleRatioY: 3876 / 2584  // 1.5
};

export const CATEGORIES = [
  { id: 'all', label: 'All Places', icon: 'Sparkles' },
  { id: 'academic', label: 'Academic Blocks', icon: 'GraduationCap' },
  { id: 'labs', label: 'Research Labs & CoEs', icon: 'Cpu' },
  { id: 'hostels', label: 'Hostels', icon: 'Home' },
  { id: 'dining', label: 'Food & Cafeterias', icon: 'Utensils' },
  { id: 'amenities', label: 'Facilities & Services', icon: 'Building' },
  { id: 'sports', label: 'Sports & Grounds', icon: 'Trophy' },
  { id: 'gates', label: 'Gates & Parking', icon: 'MapPin' }
];

export const CAMPUS_PLACES = [
  // Academic Blocks
  {
    id: 'ib-block-2',
    name: 'IB Block (Information & Computing Block)',
    shortName: 'IB Block',
    category: 'academic',
    x: 775,
    y: 1490,
    icon: 'office',
    junction: 'J103104',
    description: 'Premier academic hub housing Computer Science, IT, Artificial Intelligence, Machine Learning and Data Science departments.',
    details: {
      head: 'Dr. Sasikala D (CSE), Dr. Gomathi R (AI&DS), Dr. Naveena S (IT)',
      floors: [
        { name: 'Ground Floor', rooms: ['CSE Department Office', 'Computing Center 1 & 2', 'Faculty Lounge', 'Seminar Hall 1'] },
        { name: 'First Floor', rooms: ['AI & Data Science HOD Cabin', 'NVIDIA Jetson AI / DL Lab', 'Apple iOS Development Lab', 'Cloud Computing Lab'] },
        { name: 'Second Floor', rooms: ['Information Technology Dept', 'Software Engineering Lab', 'Cyber Security Center', 'Classrooms IB-201 to IB-212'] },
        { name: 'Third Floor', rooms: ['AI & Machine Learning Dept', 'IoT and Smart Systems Lab', 'Postgraduate Research Lab', 'Classrooms IB-301 to IB-315'] }
      ]
    }
  },
  {
    id: 'sf-block',
    name: 'Sunflower (SF) Block',
    shortName: 'SF Block',
    category: 'academic',
    x: 1330,
    y: 1300,
    icon: 'office',
    junction: 'J014011',
    description: 'Central engineering facility accommodating Electronics & Communication (ECE), Electrical & Electronics (EEE), and Instrumentation.',
    details: {
      head: 'Dr. Prakash S P (ECE), Dr. Maheswari K T (EEE)',
      floors: [
        { name: 'Ground Floor', rooms: ['ECE Department Office', 'Digital Signal Processing Lab', 'Analog Electronics Lab'] },
        { name: 'First Floor', rooms: ['VLSI Design Center', 'Siemens Drives & Automation CoE', 'Microcontroller Lab'] },
        { name: 'Second Floor', rooms: ['EEE Department Office', 'Power Electronics & Drives Lab', 'Renewable Energy Lab'] },
        { name: 'Third Floor', rooms: ['Electronics & Instrumentation (EIE)', 'Industrial Automation & PLC Lab', 'Smart Sensor Lab'] }
      ]
    }
  },
  {
    id: 'as-main-left',
    name: 'AS Block (Applied Science & Humanities)',
    shortName: 'AS Block',
    category: 'academic',
    x: 1050,
    y: 1490,
    icon: 'office',
    junction: 'J113114',
    description: 'Core foundation block for first-year engineering students, basic sciences, and humanities.',
    details: {
      head: 'Dr. Praveena R (Chemistry), Dr. Sadasivam K (Physics), Dr. Parimala M (Maths)',
      floors: [
        { name: 'Ground Floor', rooms: ['Dean Academics Office', 'First Year Student Cell', 'Engineering Chemistry Lab'] },
        { name: 'First Floor', rooms: ['Engineering Physics Lab', 'Mathematics Research Cell', 'Classrooms AS-101 to AS-110'] },
        { name: 'Second Floor', rooms: ['Language Communication Lab', 'Multimedia Audio-Visual Room', 'Classrooms AS-201 to AS-212'] }
      ]
    }
  },
  {
    id: 'mechanic-back',
    name: 'Mechanical & Mechatronics Block',
    shortName: 'Mechanical Block',
    category: 'academic',
    x: 1390,
    y: 1413,
    icon: 'office',
    junction: 'J020022',
    description: 'State-of-the-art workshops, CAD/CAM centers, robotics, and advanced manufacturing machinery.',
    details: {
      head: 'Dr. Ravi Kumar M (Mech), Dr. Senthil Kumar K L (Mechatronics)',
      floors: [
        { name: 'Ground Floor', rooms: ['Manufacturing Technology Workshop', 'Thermal Engineering Lab', 'Foundry & Metallurgy Lab', 'CNC Machining Center'] },
        { name: 'First Floor', rooms: ['Mechatronics Dept Office', 'Robotics & Automation Lab', 'Hydraulics and Pneumatics Lab'] },
        { name: 'Second Floor', rooms: ['CAD / CAM / CAE Center', 'Automotive Systems Lab', 'Siemens PLM Center'] }
      ]
    }
  },
  {
    id: 'as-main-right',
    name: 'Special Research Labs & CoE Center',
    shortName: 'Special Research Labs',
    category: 'labs',
    x: 1020,
    y: 1200,
    icon: 'office',
    junction: 'J010011',
    description: 'Specialized interdisciplinary research hubs, prototyping facilities, and incubation centers.',
    details: {
      head: 'Dean Research & Innovation',
      floors: [
        { name: 'Ground Floor', rooms: ['OPAL-RT Innovation Centre', 'Virtusa Digital Engineering CoE', 'Bosch Automotive Lab'] },
        { name: 'First Floor', rooms: ['Center for Cyber Physical Systems', 'IoT & Smart City Rapid Prototyping Lab', 'AI Innovation Lab'] }
      ]
    }
  },
  {
    id: 'smart-agri-fields',
    name: 'Smart Agriculture & Biotech Research Grounds',
    shortName: 'Agri Fields & Biotech',
    category: 'labs',
    x: 1070,
    y: 930,
    icon: 'office',
    junction: 'J006008',
    description: 'Experimental fields, polyhouse research units, drone survey base, and automated irrigation testbeds.',
    details: {
      head: 'Dr. Chelladurai V (Agri Dept)',
      floors: [
        { name: 'Ground Floor', rooms: ['Agricultural Machinery Lab', 'Soil & Water Quality Testing Unit', 'Precision Farming Polyhouse', 'Drone Flight Station'] }
      ]
    }
  },

  // Amenities & Administration
  {
    id: 'principal-office',
    name: 'Administrative Block & Principal Office',
    shortName: 'Admin & Principal Office',
    category: 'amenities',
    x: 1290,
    y: 950,
    icon: 'office',
    junction: 'J007008',
    description: 'Principal office, Chairman & Director executive suites, Admission cell, Exam Controller, and Accounts.',
    details: {
      head: 'Principal Dr. C. Palanisamy',
      floors: [
        { name: 'Ground Floor', rooms: ['Admission Office', 'Student Verification & Bonafide Counter', 'Accounts & Fee Desk', 'Cashier'] },
        { name: 'First Floor', rooms: ['Principal Office', 'Executive Board Room', 'Office of the Controller of Examinations (COE)'] },
        { name: 'Second Floor', rooms: ['Human Resources Office', 'Registrar Office', 'Quality Assurance (IQAC) Cell'] }
      ]
    }
  },
  {
    id: 'library',
    name: 'Dr. S.V. Balasubramaniam Central Library',
    shortName: 'Central Library',
    category: 'amenities',
    x: 920,
    y: 1805,
    icon: 'library',
    junction: 'J111014',
    description: 'Air-conditioned multi-floor central library with over 100,000 volumes, IEEE/Elsevier digital access, and 24/7 study rooms.',
    details: {
      head: 'Chief Librarian',
      floors: [
        { name: 'Ground Floor', rooms: ['Circulation Desk', 'Book Issue & Return Counter', 'New Arrivals Display', 'Reprography Center'] },
        { name: 'First Floor', rooms: ['Digital Knowledge Hub (120 PC Terminals)', 'E-Journals & IEEE Access', 'Periodicals & Magazines'] },
        { name: 'Second Floor', rooms: ['Engineering Reference Section', 'Competitive Exam Preparation Hub (GATE, GRE, UPSC)', 'Quiet Study Lounge'] },
        { name: 'Third Floor', rooms: ['Rare Books & Institutional Repository', 'Discussion Rooms & Seminar Space'] }
      ]
    }
  },
  {
    id: 'main-auditorium',
    name: 'Main Auditorium & Convention Centre',
    shortName: 'Main Auditorium',
    category: 'amenities',
    x: 910,
    y: 1700,
    icon: 'office',
    junction: 'J112113',
    description: '2,500-capacity state-of-the-art auditorium for symposiums, cultural fests, graduations, and guest lectures.',
    details: {
      head: 'Auditorium Management Cell',
      floors: [
        { name: 'Ground Floor', rooms: ['Main Stage & Green Rooms', 'Stall Seating (1,800 Seats)', 'AV Control Booth'] },
        { name: 'Balcony', rooms: ['Balcony Seating (700 Seats)', 'VIP Lounge & Media Box'] }
      ]
    }
  },
  {
    id: 'medical-centre',
    name: '24/7 Campus Medical Centre & Ambulance Base',
    shortName: 'Medical Centre (24x7)',
    category: 'amenities',
    x: 290,
    y: 1930,
    icon: 'medical',
    junction: 'J120121',
    description: 'Round-the-clock medical care with resident doctors, in-patient beds, pharmacy, and ICU-equipped ambulance.',
    details: {
      head: 'Dr. M.S. Soundararajan (MBBS), Dr. V. Sandhya (MBBS) | Emergency: 04295-226108',
      floors: [
        { name: 'Ground Floor', rooms: ['Emergency Triage & Consultation', 'In-Patient Observation Ward (10 Beds)', 'Pharmacy Counter', 'Ambulance Bay (24x7)'] }
      ]
    }
  },
  {
    id: 'guest-house',
    name: 'BIT VIP Guest House',
    shortName: 'Guest House',
    category: 'amenities',
    x: 1355,
    y: 400,
    icon: 'office',
    junction: 'J001002',
    description: 'Furnished air-conditioned suites for visiting dignitaries, external examiners, recruiters, and parents.',
    details: {
      head: 'Estate & Hospitality Officer',
      floors: [
        { name: 'Ground & 1st Floor', rooms: ['VIP Executive Suites 1–12', 'Dining Lounge & Kitchen', 'Reception Lobby'] }
      ]
    }
  },
  {
    id: 'staff-quarters',
    name: 'Faculty & Staff Residential Quarters',
    shortName: 'Staff Quarters',
    category: 'amenities',
    x: 500,
    y: 590,
    icon: 'office',
    junction: 'J012013',
    description: 'Peaceful residential living quarters for professors, HODs, and campus staff with manicured gardens.',
    details: {
      head: 'Estate Office',
      floors: [{ name: 'Blocks A–F', rooms: ['Staff Apartments', 'Children Play Area', 'Community Park'] }]
    }
  },

  // Hostels - Men's
  {
    id: 'sapphire',
    name: 'Sapphire Men\'s Hostel',
    shortName: 'Sapphire Hostel',
    category: 'hostels',
    x: 1490,
    y: 2100,
    icon: 'hostel',
    junction: 'J032036',
    description: 'Modern 4-bedded air-cooled men\'s residential block with indoor games, high-speed Wi-Fi, and study halls.',
    details: {
      head: 'Deputy Warden (Sapphire Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['282 4-Bedded Rooms (Capacity: 1,128)', 'Warden Office', 'Reading Room', 'Gym Facility'] }
      ]
    }
  },
  {
    id: 'emerald',
    name: 'Emerald Men\'s Hostel',
    shortName: 'Emerald Hostel',
    category: 'hostels',
    x: 1490,
    y: 1600,
    icon: 'hostel',
    junction: 'J027028',
    description: 'Spacious men\'s hostel featuring 4-bedded rooms, quiet study halls, and biometric access.',
    details: {
      head: 'Deputy Warden (Emerald Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['284 4-Bedded Rooms (Capacity: 1,136)', 'TV & Recreation Hall', 'Solar Water Facility'] }
      ]
    }
  },
  {
    id: 'ruby',
    name: 'Ruby Men\'s Hostel',
    shortName: 'Ruby Hostel',
    category: 'hostels',
    x: 1790,
    y: 2100,
    icon: 'hostel',
    junction: 'J038039',
    description: 'Premium men\'s block with single, double, and 4-bedded options for senior and PG students.',
    details: {
      head: 'Deputy Warden (Ruby Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['24 Single Rooms', '145 Double Rooms', '68 4-Bedded Rooms', 'Study Lounge'] }
      ]
    }
  },
  {
    id: 'diamond',
    name: 'Diamond Men\'s Hostel',
    shortName: 'Diamond Hostel',
    category: 'hostels',
    x: 1730,
    y: 1580,
    icon: 'hostel',
    junction: 'J030031',
    description: 'Quiet residential block accommodating final year and postgraduate scholars in double & single rooms.',
    details: {
      head: 'Deputy Warden (Diamond Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['34 Single AC Rooms', '146 Double Rooms', 'High-Speed Wi-Fi Zone'] }
      ]
    }
  },
  {
    id: 'coral',
    name: 'Coral Hostel (International & NRI Block)',
    shortName: 'Coral Hostel',
    category: 'hostels',
    x: 1290,
    y: 1660,
    icon: 'hostel',
    junction: 'J025026',
    description: 'Air-conditioned premium residential block tailored for NRI and international exchange scholars.',
    details: {
      head: 'International Affairs Officer',
      floors: [
        { name: 'Ground to 2nd Floor', rooms: ['51 Double AC Rooms', 'Common Lounge & Kitchenette', 'Laundry Station'] }
      ]
    }
  },
  {
    id: 'pearl',
    name: 'Pearl Men\'s Hostel',
    shortName: 'Pearl Hostel',
    category: 'hostels',
    x: 1820,
    y: 2230,
    icon: 'hostel',
    junction: 'J061062',
    description: 'Modern men\'s hostel located adjacent to sports grounds and agri playground.',
    details: {
      head: 'Deputy Warden (Pearl Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['138 4-Bedded Rooms', 'Table Tennis Room', 'Fitness Corner'] }
      ]
    }
  },

  // Hostels - Women's
  {
    id: 'ganga',
    name: 'Ganga Women\'s Hostel',
    shortName: 'Ganga Hostel',
    category: 'hostels',
    x: 500,
    y: 2100,
    icon: 'hostel',
    junction: 'J124125',
    description: 'Primary women\'s block with 24/7 security, attached reading halls, and beauty parlour ("Studio 7").',
    details: {
      head: 'Chief Warden (Women\'s Hostels)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['116 4-Bedded Rooms', '5 Double Rooms', '9 Guest Suites', 'Women\'s Parlour & Gym'] }
      ]
    }
  },
  {
    id: 'yamuna',
    name: 'Yamuna Women\'s Hostel',
    shortName: 'Yamuna Hostel',
    category: 'hostels',
    x: 800,
    y: 2100,
    icon: 'hostel',
    junction: 'J114115',
    description: 'Comfortable women\'s residential facility with spacious 4-bedded and double rooms.',
    details: {
      head: 'Deputy Warden (Yamuna Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['93 4-Bedded Rooms', '6 Double Rooms', 'Common Recreation Lounge'] }
      ]
    }
  },
  {
    id: 'narmadha',
    name: 'Narmadha Women\'s Hostel',
    shortName: 'Narmadha Hostel',
    category: 'hostels',
    x: 300,
    y: 2100,
    icon: 'hostel',
    junction: 'J126127',
    description: 'Large women\'s residential block accommodating multi-sharing and single rooms with RO water and solar heating.',
    details: {
      head: 'Deputy Warden (Narmadha Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['96 4-Bedded Rooms', '16 Double Rooms', '8 Single AC Rooms', '8 5-Bedded Rooms'] }
      ]
    }
  },
  {
    id: 'kaveri',
    name: 'Kaveri Women\'s Hostel',
    shortName: 'Kaveri Hostel',
    category: 'hostels',
    x: 400,
    y: 2250,
    icon: 'hostel',
    junction: 'J128129',
    description: 'Dedicated final-year and PG women\'s block with individual study cubicles and single rooms.',
    details: {
      head: 'Deputy Warden (Kaveri Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['111 Double Rooms', '15 Single Rooms', 'Digital Study Lab'] }
      ]
    }
  },
  {
    id: 'middle-bhavani',
    name: 'Bhavani Women\'s Hostel (North & South Blocks)',
    shortName: 'Bhavani Hostel',
    category: 'hostels',
    x: 800,
    y: 2300,
    icon: 'hostel',
    junction: 'J116117',
    description: 'Twin blocks accommodating first-year women scholars with strict security and dedicated mentors.',
    details: {
      head: 'Deputy Warden (Bhavani Block)',
      floors: [
        { name: 'Ground to 3rd Floor', rooms: ['128 4-Bedded Rooms across North & South Wings', 'Study & Counselling Hall'] }
      ]
    }
  },

  // Food & Dining
  {
    id: 'cafeteria',
    name: 'Central Campus Cafeteria & Food Court',
    shortName: 'Central Food Court',
    category: 'dining',
    x: 1050,
    y: 1980,
    icon: 'food',
    junction: 'J096037',
    description: 'Multicuisine food court serving fresh south-Indian, north-Indian, Chinese, hot snacks, fresh juices, and ice creams.',
    details: {
      head: 'Canteen Services | 7:30 AM - 9:30 PM',
      floors: [
        { name: 'Ground Floor', rooms: ['Food Court Counters', 'Fresh Juice & Bakery Bar', 'Meat & Eat Express', 'Seating for 800'] }
      ]
    }
  },
  {
    id: 'boys-mess',
    name: 'Men\'s Dining Complex (Main Mess)',
    shortName: 'Boys Mess',
    category: 'dining',
    x: 1580,
    y: 1820,
    icon: 'food',
    junction: 'J048049',
    description: 'Mega hygienic vegetarian dining facility accommodating 3,500 students with steam cooking and solar water.',
    details: {
      head: 'Mess Manager | Breakfast, Lunch, Snacks & Dinner',
      floors: [
        { name: 'Ground & 1st Floor', rooms: ['Dining Halls A & B (Capacity: 3,500)', 'Modern Steam Kitchen', 'Evening Snacks Counter'] }
      ]
    }
  },
  {
    id: 'girls-mess',
    name: 'Women\'s Dining Complex (Ganga Mess)',
    shortName: 'Girls Mess',
    category: 'dining',
    x: 640,
    y: 2250,
    icon: 'food',
    junction: 'J122148',
    description: 'Spacious hygienic dining hall dedicated to women hostellers with balanced dietary menus.',
    details: {
      head: 'Women\'s Mess Warden',
      floors: [
        { name: 'Ground Floor', rooms: ['Dining Hall (Capacity: 2,200)', 'Dietary Kitchen', 'Evening Beverage Counter'] }
      ]
    }
  },

  // Sports & Fitness
  {
    id: 'cricket-ground',
    name: 'BIT International Standard Cricket Stadium',
    shortName: 'Cricket Ground',
    category: 'sports',
    x: 405,
    y: 1500,
    icon: 'cricket',
    junction: 'J012144',
    description: 'Lush turf cricket ground with pavilion, practice nets, floodlights, and match spectator seating.',
    details: {
      head: 'Physical Education Department',
      floors: [{ name: 'Ground Level', rooms: ['Turf Pitch & Outfield', 'Pavilion & Dressing Rooms', 'Bowling Practice Nets'] }]
    }
  },
  {
    id: 'football-ground',
    name: 'Campus Football Field & Athletic Track',
    shortName: 'Football Ground',
    category: 'sports',
    x: 400,
    y: 1130,
    icon: 'football',
    junction: 'J011012',
    description: 'Regulation football field encircled by a 400m synthetic athletic track.',
    details: {
      head: 'Sports Director',
      floors: [{ name: 'Ground Level', rooms: ['Football Field', '400m 8-Lane Running Track', 'Long Jump & Shot Put Arena'] }]
    }
  },
  {
    id: 'basket-ball-court',
    name: 'Synthetic Basketball Courts (Floodlit)',
    shortName: 'Basketball Courts',
    category: 'sports',
    x: 1010,
    y: 2120,
    icon: 'gym',
    junction: 'J094095',
    description: 'Polyurethane coated synthetic basketball courts with high-intensity LED floodlights for evening games.',
    details: {
      head: 'Physical Education Dept',
      floors: [{ name: 'Ground Level', rooms: ['Court 1 & Court 2', 'Spectator Gallery'] }]
    }
  },
  {
    id: 'tennis-court-2',
    name: 'Clay & Hard Tennis Courts',
    shortName: 'Tennis Courts',
    category: 'sports',
    x: 1140,
    y: 2120,
    icon: 'gym',
    junction: 'J092093',
    description: 'Two competition-grade tennis courts with professional coaching and tournament facilities.',
    details: {
      head: 'Tennis Club In-Charge',
      floors: [{ name: 'Ground Level', rooms: ['Court A & Court B', 'Equipment Room'] }]
    }
  },
  {
    id: 'volley-ball-court',
    name: 'Volleyball Courts',
    shortName: 'Volleyball Courts',
    category: 'sports',
    x: 940,
    y: 2120,
    icon: 'gym',
    junction: 'J097098',
    description: 'Dedicated outdoor volleyball courts for intra-college and zonal tournaments.',
    details: {
      head: 'Sports Club',
      floors: [{ name: 'Ground Level', rooms: ['Men\'s & Women\'s Courts'] }]
    }
  },

  // Gates & Parking
  {
    id: 'main-gate',
    name: 'Main Gate 1 & Security Checkpost',
    shortName: 'Main Gate 1',
    category: 'gates',
    x: 1140,
    y: 290,
    icon: 'parking',
    junction: 'J001002',
    description: 'Primary campus entrance on Sathy-Bhavani Road with visitor reception, pass counter, and security booth.',
    details: {
      head: 'Chief Security Officer | Control Desk: 04295-226100',
      floors: [
        { name: 'Ground Level', rooms: ['Security Gate 1', 'Visitor Registration Booth', 'Vehicle Pass Desk'] }
      ]
    }
  },
  {
    id: 'west-gate',
    name: 'West Gate 2 (Hostel & Medical Entrance)',
    shortName: 'West Gate 2',
    category: 'gates',
    x: 95,
    y: 1890,
    icon: 'parking',
    junction: 'J120121',
    description: 'Direct western entrance for emergency medical vehicles, staff residences, and women\'s hostel deliveries.',
    details: {
      head: 'West Gate Security Post',
      floors: [{ name: 'Ground Level', rooms: ['Security Outpost', 'Emergency Barrier'] }]
    }
  },
  {
    id: 'bus',
    name: 'Day Scholar College Bus Bay & Terminal',
    shortName: 'Bus Bay',
    category: 'gates',
    x: 868,
    y: 820,
    icon: 'parking',
    junction: 'J003004',
    description: 'Parking and boarding terminal for 60+ college buses operating to Coimbatore, Erode, Tirupur, and Gobichettipalayam.',
    details: {
      head: 'Transport Manager | Office: 04295-226000',
      floors: [{ name: 'Ground Level', rooms: ['Bus Platforms 1–15', 'Driver Rest Area', 'Transport Office Desk'] }]
    }
  },
  {
    id: 'main-parking',
    name: 'Main Visitors & Staff Parking Area',
    shortName: 'Main Parking',
    category: 'gates',
    x: 1310,
    y: 590,
    icon: 'parking',
    junction: 'J002003',
    description: 'Covered four-wheeler and two-wheeler parking adjacent to the admin block and guest house.',
    details: {
      head: 'Campus Security',
      floors: [{ name: 'Ground Level', rooms: ['Faculty Four-Wheeler Bay', 'Visitors Parking Zone', 'Two-Wheeler Shed'] }]
    }
  }
];

// Junction Nodes Coordinate Map for Pathfinding & Animated Route Rendering
// (Normalized to standard map canvas coordinate system)
export const JUNCTION_COORDS = {
  J001002: { x: 1140, y: 350 },
  J002003: { x: 1200, y: 550 },
  J003004: { x: 920, y: 800 },
  J003005: { x: 1210, y: 800 },
  J004006: { x: 930, y: 920 },
  J005007: { x: 1240, y: 930 },
  J006008: { x: 1050, y: 940 },
  J007008: { x: 1260, y: 970 },
  J008009: { x: 1380, y: 980 },
  J007010: { x: 1230, y: 1120 },
  J010011: { x: 1040, y: 1150 },
  J011012: { x: 620, y: 1140 },
  J012013: { x: 420, y: 1150 },
  J010015: { x: 1230, y: 1260 },
  J015016: { x: 1320, y: 1270 },
  J016018: { x: 1380, y: 1320 },
  J015017: { x: 1230, y: 1380 },
  J017018: { x: 1370, y: 1390 },
  J017019: { x: 1220, y: 1510 },
  J019021: { x: 1220, y: 1620 },
  J020022: { x: 1420, y: 1450 },
  J021022: { x: 1350, y: 1610 },
  J021023: { x: 1220, y: 1680 },
  J023024: { x: 1340, y: 1680 },
  J023027: { x: 1220, y: 1780 },
  J024026: { x: 1460, y: 1680 },
  J025026: { x: 1340, y: 1720 },
  J027025: { x: 1280, y: 1750 },
  J027028: { x: 1220, y: 1840 },
  J028029: { x: 1220, y: 1910 },
  J029030: { x: 1460, y: 1890 },
  J030031: { x: 1710, y: 1620 },
  J029032: { x: 1220, y: 1980 },
  j032033: { x: 1340, y: 1980 },
  j033034: { x: 1340, y: 2040 },
  J034035: { x: 1340, y: 2090 },
  J032036: { x: 1220, y: 2070 },
  J035036: { x: 1340, y: 2080 },
  J036037: { x: 1220, y: 2130 },
  J037038: { x: 1220, y: 2190 },
  J038039: { x: 1540, y: 2160 },
  J039040: { x: 1740, y: 2130 },
  J038041: { x: 1220, y: 2270 },
  J041042: { x: 1220, y: 2340 },
  J042043: { x: 1340, y: 2330 },
  J043044: { x: 1340, y: 2390 },
  J044045: { x: 1340, y: 2470 },
  J042046: { x: 1220, y: 2420 },
  J046047: { x: 1220, y: 2480 },
  J047045: { x: 1340, y: 2480 },
  J047048: { x: 1220, y: 2540 },
  J048049: { x: 1420, y: 2520 },
  J049050: { x: 1580, y: 2490 },
  J050051: { x: 1740, y: 2470 },
  J051052: { x: 1840, y: 2450 },
  J051053: { x: 1820, y: 2350 },
  J053061: { x: 1820, y: 2230 },
  J061062: { x: 1760, y: 2240 },
  J063062: { x: 1760, y: 2060 },
  J064065: { x: 1860, y: 2030 },
  J088048: { x: 1100, y: 1820 },
  J088120: { x: 880, y: 1820 },
  J096037: { x: 1040, y: 2020 },
  J094095: { x: 1040, y: 2120 },
  J092093: { x: 1140, y: 2120 },
  J097098: { x: 940, y: 2120 },
  J103104: { x: 780, y: 1520 },
  J111014: { x: 920, y: 1820 },
  J014011: { x: 1200, y: 1320 },
  J112113: { x: 920, y: 1720 },
  J113114: { x: 1020, y: 1560 },
  J114115: { x: 800, y: 2100 },
  J116117: { x: 800, y: 2300 },
  J118119: { x: 620, y: 2120 },
  J119120: { x: 500, y: 2120 },
  J120121: { x: 290, y: 1950 },
  J122148: { x: 640, y: 2270 },
  J124125: { x: 500, y: 2150 },
  J126127: { x: 300, y: 2120 },
  J128129: { x: 400, y: 2270 },
  J012144: { x: 420, y: 1500 }
};

// Route Network Edges with weights (walking distance in meters)
export const ROUTE_EDGES = [
  { from: 'J001002', to: 'J002003', weight: 120 },
  { from: 'J002003', to: 'J003005', weight: 150 },
  { from: 'J003004', to: 'J004006', weight: 80 },
  { from: 'J003004', to: 'J003005', weight: 180 },
  { from: 'J004006', to: 'J006008', weight: 90 },
  { from: 'J005007', to: 'J007008', weight: 60 },
  { from: 'J006008', to: 'J007008', weight: 120 },
  { from: 'J007008', to: 'J008009', weight: 80 },
  { from: 'J007008', to: 'J007010', weight: 110 },
  { from: 'J007010', to: 'J010011', weight: 130 },
  { from: 'J010011', to: 'J011012', weight: 260 },
  { from: 'J011012', to: 'J012013', weight: 140 },
  { from: 'J007010', to: 'J010015', weight: 90 },
  { from: 'J010015', to: 'J015016', weight: 60 },
  { from: 'J015016', to: 'J016018', weight: 50 },
  { from: 'J015016', to: 'J015017', weight: 70 },
  { from: 'J015017', to: 'J017018', weight: 90 },
  { from: 'J017018', to: 'J020022', weight: 60 },
  { from: 'J015017', to: 'J017019', weight: 90 },
  { from: 'J017019', to: 'J019021', weight: 80 },
  { from: 'J019021', to: 'J021022', weight: 90 },
  { from: 'J020022', to: 'J021022', weight: 110 },
  { from: 'J019021', to: 'J021023', weight: 50 },
  { from: 'J021023', to: 'J023024', weight: 80 },
  { from: 'J023024', to: 'J024026', weight: 80 },
  { from: 'J021023', to: 'J023027', weight: 70 },
  { from: 'J023027', to: 'J027025', weight: 50 },
  { from: 'J027025', to: 'J025026', weight: 50 },
  { from: 'J025026', to: 'J024026', weight: 80 },
  { from: 'J023027', to: 'J027028', weight: 50 },
  { from: 'J027028', to: 'J028029', weight: 50 },
  { from: 'J028029', to: 'J029030', weight: 160 },
  { from: 'J029030', to: 'J030031', weight: 170 },
  { from: 'J028029', to: 'J029032', weight: 50 },
  { from: 'J029032', to: 'j032033', weight: 80 },
  { from: 'j032033', to: 'j033034', weight: 40 },
  { from: 'j033034', to: 'J034035', weight: 40 },
  { from: 'J029032', to: 'J032036', weight: 60 },
  { from: 'J034035', to: 'J035036', weight: 30 },
  { from: 'J032036', to: 'J036037', weight: 40 },
  { from: 'J036037', to: 'J037038', weight: 40 },
  { from: 'J037038', to: 'J038039', weight: 190 },
  { from: 'J038039', to: 'J039040', weight: 130 },
  { from: 'J037038', to: 'J038041', weight: 60 },
  { from: 'J038041', to: 'J041042', weight: 50 },
  { from: 'J041042', to: 'J042043', weight: 70 },
  { from: 'J042043', to: 'J043044', weight: 40 },
  { from: 'J043044', to: 'J044045', weight: 50 },
  { from: 'J041042', to: 'J042046', weight: 50 },
  { from: 'J042046', to: 'J046047', weight: 40 },
  { from: 'J046047', to: 'J047045', weight: 70 },
  { from: 'J046047', to: 'J047048', weight: 40 },
  { from: 'J047048', to: 'J048049', weight: 130 },
  { from: 'J048049', to: 'J049050', weight: 110 },
  { from: 'J049050', to: 'J050051', weight: 110 },
  { from: 'J050051', to: 'J051052', weight: 80 },
  { from: 'J051052', to: 'J051053', weight: 70 },
  { from: 'J051053', to: 'J053061', weight: 80 },
  { from: 'J053061', to: 'J061062', weight: 50 },
  { from: 'J061062', to: 'J063062', weight: 120 },
  { from: 'J063062', to: 'J064065', weight: 80 },
  { from: 'J039040', to: 'J064065', weight: 100 },

  // Connecting Wings & West Campuses
  { from: 'J017019', to: 'J088048', weight: 150 },
  { from: 'J088048', to: 'J088120', weight: 150 },
  { from: 'J088120', to: 'J111014', weight: 40 },
  { from: 'J111014', to: 'J112113', weight: 70 },
  { from: 'J112113', to: 'J103104', weight: 160 },
  { from: 'J112113', to: 'J113114', weight: 130 },
  { from: 'J113114', to: 'J010011', weight: 260 },
  { from: 'J088048', to: 'J096037', weight: 140 },
  { from: 'J096037', to: 'J094095', weight: 70 },
  { from: 'J094095', to: 'J092093', weight: 70 },
  { from: 'J094095', to: 'J097098', weight: 50 },
  { from: 'J096037', to: 'J036037', weight: 130 },
  { from: 'J088120', to: 'J114115', weight: 190 },
  { from: 'J114115', to: 'J116117', weight: 130 },
  { from: 'J114115', to: 'J118119', weight: 120 },
  { from: 'J118119', to: 'J119120', weight: 80 },
  { from: 'J119120', to: 'J124125', weight: 40 },
  { from: 'J119120', to: 'J120121', weight: 180 },
  { from: 'J124125', to: 'J126127', weight: 140 },
  { from: 'J124125', to: 'J122148', weight: 120 },
  { from: 'J122148', to: 'J128129', weight: 160 },
  { from: 'J011012', to: 'J012144', weight: 240 },
  { from: 'J012144', to: 'J120121', weight: 310 }
];

// Dijkstra Shortest Path Finder
export function findShortestPath(startJunction, endJunction) {
  if (!startJunction || !endJunction || startJunction === endJunction) {
    return { path: [startJunction], distance: 0, coords: [JUNCTION_COORDS[startJunction] || { x: 0, y: 0 }] };
  }

  // Build Adjacency List
  const graph = {};
  Object.keys(JUNCTION_COORDS).forEach(node => {
    graph[node] = [];
  });

  ROUTE_EDGES.forEach(({ from, to, weight }) => {
    if (graph[from] && graph[to]) {
      graph[from].push({ node: to, weight });
      graph[to].push({ node: from, weight });
    }
  });

  const distances = {};
  const previous = {};
  const unvisited = new Set(Object.keys(graph));

  Object.keys(graph).forEach(node => {
    distances[node] = Infinity;
  });
  distances[startJunction] = 0;

  while (unvisited.size > 0) {
    // Pick unvisited node with smallest distance
    let current = null;
    unvisited.forEach(node => {
      if (current === null || distances[node] < distances[current]) {
        current = node;
      }
    });

    if (distances[current] === Infinity || current === endJunction) {
      break;
    }

    unvisited.delete(current);

    graph[current].forEach(({ node: neighbor, weight }) => {
      if (unvisited.has(neighbor)) {
        const alt = distances[current] + weight;
        if (alt < distances[neighbor]) {
          distances[neighbor] = alt;
          previous[neighbor] = current;
        }
      }
    });
  }

  // Reconstruct path
  const path = [];
  let curr = endJunction;
  while (curr) {
    path.unshift(curr);
    curr = previous[curr];
  }

  if (path[0] !== startJunction) {
    // No path found, fallback to direct line
    return {
      path: [startJunction, endJunction],
      distance: Math.round(
        Math.hypot(
          (JUNCTION_COORDS[endJunction]?.x || 0) - (JUNCTION_COORDS[startJunction]?.x || 0),
          (JUNCTION_COORDS[endJunction]?.y || 0) - (JUNCTION_COORDS[startJunction]?.y || 0)
        )
      ),
      coords: [
        JUNCTION_COORDS[startJunction] || { x: 0, y: 0 },
        JUNCTION_COORDS[endJunction] || { x: 0, y: 0 }
      ]
    };
  }

  const coords = path.map(node => JUNCTION_COORDS[node]);
  return {
    path,
    distance: distances[endJunction] || 0,
    coords
  };
}

// Generate human-readable turn-by-turn navigation instructions
export function generateDirections(startPlace, endPlace, pathResult) {
  if (!startPlace || !endPlace) return [];

  const distanceMeters = pathResult.distance || 150;
  const walkMinutes = Math.max(1, Math.round(distanceMeters / 75)); // Average 75m/min walking speed

  const steps = [
    `Start from **${startPlace.name}** near the ground exit.`,
    `Proceed along the main walkway towards the **${pathResult.path.length > 2 ? 'central corridor' : endPlace.shortName}** (~${Math.round(distanceMeters * 0.4)}m).`,
    distanceMeters > 200
      ? `Continue straight past the connecting academic block & garden crossing (~${Math.round(distanceMeters * 0.4)}m).`
      : `Follow the shaded campus avenue towards your destination.`,
    `You have arrived at **${endPlace.name}** (Total walking distance: ~${distanceMeters}m, approx. ${walkMinutes} min walk).`
  ];

  return {
    distanceMeters,
    walkMinutes,
    steps
  };
}
