import * as bcrypt from 'bcrypt';
import mongoose, { Types } from 'mongoose';
import { BrandSchema } from '../../modules/brands/schemas/brand.schema';
import { CategorySchema } from '../../modules/categories/schemas/category.schema';
import { ProductSchema } from '../../modules/products/schemas/product.schema';
import { UserSchema } from '../../modules/users/schemas/user.schema';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/gridline_ecommerce';

async function seed() {
  console.log(`Connecting to MongoDB at: ${MONGODB_URI}...`);
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const UserModel = mongoose.model('User', UserSchema, 'users');
  const CategoryModel = mongoose.model(
    'Category',
    CategorySchema,
    'categories',
  );
  const BrandModel = mongoose.model('Brand', BrandSchema, 'brands');
  const ProductModel = mongoose.model('Product', ProductSchema, 'products');

  // 1. Seed Demo Admin & Demo Customer
  console.log('Seeding demo users...');
  const adminPasswordHash = await bcrypt.hash('Admin@123456', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@123456', 10);

  await UserModel.findOneAndUpdate(
    { email: 'admin@gridline.com' },
    {
      $set: {
        firstName: 'System',
        lastName: 'Admin',
        email: 'admin@gridline.com',
        passwordHash: adminPasswordHash,
        authProvider: 'local',
        role: 'admin',
        isActive: true,
        isEmailVerified: true,
      },
    },
    { upsert: true, new: true },
  );

  await UserModel.findOneAndUpdate(
    { email: 'customer@gridline.com' },
    {
      $set: {
        firstName: 'Demo',
        lastName: 'Customer',
        email: 'customer@gridline.com',
        passwordHash: customerPasswordHash,
        authProvider: 'local',
        role: 'customer',
        isActive: true,
        isEmailVerified: true,
      },
    },
    { upsert: true, new: true },
  );

  // 2. Seed Categories
  console.log('Seeding automotive categories...');
  const categoriesData = [
    {
      name: 'Brakes & Rotors',
      slug: 'brakes-rotors',
      description:
        'High performance brake calipers, carbon ceramic and drilled rotors',
      image:
        'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=800&auto=format&fit=crop',
      status: 'active',
    },
    {
      name: 'Exhaust Systems',
      slug: 'exhaust-systems',
      description:
        'Full titanium and stainless steel valved exhaust systems and headers',
      image:
        'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=800&auto=format&fit=crop',
      status: 'active',
    },
    {
      name: 'Wheels & Tires',
      slug: 'wheels-tires',
      description:
        'Lightweight forged monobloc wheels and ultra-high-performance tires',
      image:
        'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=800&auto=format&fit=crop',
      status: 'active',
    },
    {
      name: 'Suspension & Coilovers',
      slug: 'suspension-coilovers',
      description:
        'Track-tested adjustable coilovers, sway bars, and lowering springs',
      image:
        'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&auto=format&fit=crop',
      status: 'active',
    },
    {
      name: 'Aero & Carbon Fiber',
      slug: 'aero-carbon-fiber',
      description:
        'Aerodynamic pre-preg carbon fiber diffusers, splitters, and spoilers',
      image:
        'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800&auto=format&fit=crop',
      status: 'active',
    },
  ];

  const categoryMap = new Map<string, Types.ObjectId>();
  for (const cat of categoriesData) {
    const doc = await CategoryModel.findOneAndUpdate(
      { slug: cat.slug },
      { $set: cat },
      { upsert: true, new: true },
    );
    categoryMap.set(cat.slug, doc._id);
  }

  // 3. Seed Brands
  console.log('Seeding automotive brands...');
  const brandsData = [
    {
      name: 'Brembo',
      slug: 'brembo',
      logo: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&auto=format&fit=crop',
      description:
        'World leader in performance braking systems for street and motorsport',
      status: 'active',
    },
    {
      name: 'Akrapovič',
      slug: 'akrapovic',
      logo: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=200&auto=format&fit=crop',
      description:
        'Pioneer in innovative titanium exhaust systems with unmistakable sound',
      status: 'active',
    },
    {
      name: 'BBS Wheels',
      slug: 'bbs',
      logo: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=200&auto=format&fit=crop',
      description:
        'Motorsport heritage engineered forged and flow-formed alloy wheels',
      status: 'active',
    },
    {
      name: 'Bilstein',
      slug: 'bilstein',
      logo: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=200&auto=format&fit=crop',
      description:
        'German engineering precision monotube gas pressure shock absorbers',
      status: 'active',
    },
    {
      name: 'Michelin',
      slug: 'michelin',
      logo: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&auto=format&fit=crop',
      description:
        'Benchmark motorsport and street performance tire technology',
      status: 'active',
    },
  ];

  const brandMap = new Map<string, Types.ObjectId>();
  for (const b of brandsData) {
    const doc = await BrandModel.findOneAndUpdate(
      { slug: b.slug },
      { $set: b },
      { upsert: true, new: true },
    );
    brandMap.set(b.slug, doc._id);
  }

  // 4. Seed Products
  console.log('Seeding catalog products...');
  const productsData = [
    {
      name: 'Brembo GT Big Brake Kit - 380mm Front',
      slug: 'brembo-gt-big-brake-kit-380mm-front',
      sku: 'BRM-GT-380',
      description:
        'Complete high-performance front braking system featuring 6-piston monobloc radial-mount calipers and 380x32mm 2-piece cross-drilled floating discs.',
      category: categoryMap.get('brakes-rotors'),
      brand: brandMap.get('brembo'),
      price: 385000, // $3,850.00
      compareAtPrice: 420000,
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=1000&auto=format&fit=crop',
          alt: 'Brembo GT Big Brake Kit Front Caliper',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Caliper Type', value: '6-Piston Monobloc' },
        { key: 'Rotor Diameter', value: '380 mm' },
        { key: 'Rotor Thickness', value: '32 mm' },
        { key: 'Finish', value: 'Hard Anodized Red' },
      ],
      compatibility: [
        {
          make: 'Porsche',
          model: '911 Carrera (992)',
          yearFrom: 2019,
          yearTo: 2024,
          notes: 'Requires min 19 inch wheels',
        },
        {
          make: 'BMW',
          model: 'M3 (G80)',
          yearFrom: 2021,
          yearTo: 2024,
          notes: 'Direct bolt-on',
        },
      ],
      stock: 14,
      reservedStock: 2,
      lowStockThreshold: 3,
      status: 'published',
      isFeatured: true,
    },
    {
      name: 'Akrapovič Evolution Line Titanium Exhaust System',
      slug: 'akrapovic-evolution-line-titanium-exhaust-system',
      sku: 'AKR-EVO-TIT',
      description:
        'Flagship lightweight titanium exhaust system engineered to enhance sound acoustics, reduce backpressure, and deliver verifiable horsepower and torque gains.',
      category: categoryMap.get('exhaust-systems'),
      brand: brandMap.get('akrapovic'),
      price: 495000, // $4,950.00
      compareAtPrice: 530000,
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?w=1000&auto=format&fit=crop',
          alt: 'Akrapovič Titanium Exhaust System',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Material', value: 'Proprietary Titanium Alloy' },
        { key: 'Weight Reduction', value: '-9.8 kg' },
        { key: 'Power Gain', value: '+14.2 HP @ 6,800 RPM' },
        { key: 'Valved', value: 'Yes, Dual Electronic Valves' },
      ],
      compatibility: [
        {
          make: 'Porsche',
          model: '911 GT3 (992)',
          yearFrom: 2021,
          yearTo: 2024,
        },
      ],
      stock: 8,
      reservedStock: 1,
      lowStockThreshold: 2,
      status: 'published',
      isFeatured: true,
    },
    {
      name: 'BBS FI-R Forged Monobloc Wheel 20x9.5',
      slug: 'bbs-fi-r-forged-monobloc-wheel-20x95',
      sku: 'BBS-FIR-20',
      description:
        'The ultimate lightweight forged wheel featuring relief-milled spokes for maximum stiffness and minimum unsprung rotational mass.',
      category: categoryMap.get('wheels-tires'),
      brand: brandMap.get('bbs'),
      price: 215000, // $2,150.00 per wheel
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?w=1000&auto=format&fit=crop',
          alt: 'BBS FI-R Forged Wheel in Satin Black',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Construction', value: '1-Piece Forged Aluminum' },
        { key: 'Diameter', value: '20 inches' },
        { key: 'Width', value: '9.5 inches' },
        { key: 'Weight', value: '7.9 kg (17.4 lbs)' },
      ],
      compatibility: [
        {
          make: 'BMW',
          model: 'M3 (G80)',
          yearFrom: 2021,
          yearTo: 2024,
        },
        {
          make: 'Porsche',
          model: '911 Carrera (992)',
          yearFrom: 2019,
          yearTo: 2024,
        },
      ],
      stock: 24,
      reservedStock: 0,
      lowStockThreshold: 4,
      status: 'published',
      isFeatured: true,
    },
    {
      name: 'Bilstein B16 PSS10 Coilover Suspension Kit',
      slug: 'bilstein-b16-pss10-coilover-suspension-kit',
      sku: 'BIL-B16-PSS10',
      description:
        'Ride-height adjustable coilover system with 10-stage parallel mechanical damping adjustment for both rebound and compression.',
      category: categoryMap.get('suspension-coilovers'),
      brand: brandMap.get('bilstein'),
      price: 248000, // $2,480.00
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=1000&auto=format&fit=crop',
          alt: 'Bilstein B16 Coilover Suspension Kit',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Damping Control', value: '10-Clicks Parallel Rebound & Bump' },
        { key: 'Lowering Range', value: '30-50 mm Front / Rear' },
        { key: 'Technology', value: 'Inverted Monotube Gas' },
      ],
      compatibility: [
        {
          make: 'BMW',
          model: '3 Series (G20)',
          yearFrom: 2019,
          yearTo: 2024,
        },
        {
          make: 'BMW',
          model: 'M3 (G80)',
          yearFrom: 2021,
          yearTo: 2024,
        },
      ],
      stock: 12,
      reservedStock: 0,
      lowStockThreshold: 3,
      status: 'published',
      isFeatured: false,
    },
    {
      name: 'Michelin Pilot Sport Cup 2 R (245/35R20)',
      slug: 'michelin-pilot-sport-cup-2-r-245-35r20',
      sku: 'MCH-PSC2R-245',
      description:
        'Track-focused ultra-high-performance tire using exclusive motorsport compound technology for maximum lateral grip and lap times.',
      category: categoryMap.get('wheels-tires'),
      brand: brandMap.get('michelin'),
      price: 48000, // $480.00
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1000&auto=format&fit=crop',
          alt: 'Michelin Pilot Sport Cup 2 R Tire',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Treadwear', value: '140' },
        { key: 'Tire Size', value: '245/35ZR20 (95Y) XL' },
        { key: 'Usage', value: 'Track Day / Extreme Street' },
      ],
      compatibility: [
        {
          make: 'Porsche',
          model: '911 GT3 (992)',
          yearFrom: 2021,
          yearTo: 2024,
        },
      ],
      stock: 32,
      reservedStock: 4,
      lowStockThreshold: 8,
      status: 'published',
      isFeatured: true,
    },
    {
      name: 'Akrapovič Pre-Preg Carbon Fiber Rear Diffuser',
      slug: 'akrapovic-pre-preg-carbon-fiber-rear-diffuser',
      sku: 'AKR-CF-DIFF',
      description:
        'Handcrafted autoclave pre-preg high-gloss carbon fiber aerodynamic diffuser engineered to cleanly optimize rear underbody airflow.',
      category: categoryMap.get('aero-carbon-fiber'),
      brand: brandMap.get('akrapovic'),
      price: 165000, // $1,650.00
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=1000&auto=format&fit=crop',
          alt: 'Carbon Fiber Aerodynamic Rear Diffuser',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Material', value: 'Autoclave Carbon Fiber' },
        { key: 'Weave', value: '2x2 Twill High Gloss' },
        { key: 'Installation', value: 'Direct Bolt-on OEM Mounting' },
      ],
      compatibility: [
        {
          make: 'BMW',
          model: 'M3 (G80)',
          yearFrom: 2021,
          yearTo: 2024,
        },
      ],
      stock: 6,
      reservedStock: 0,
      lowStockThreshold: 2,
      status: 'published',
      isFeatured: false,
    },
    {
      name: 'Brembo X-Tra Cross-Drilled Brake Rotors Pair',
      slug: 'brembo-x-tra-cross-drilled-brake-rotors-pair',
      sku: 'BRM-XTRA-340',
      description:
        'Cross-drilled sports brake disc pair offering superior wet-weather friction response and thermal fade resistance with anti-corrosion UV paint.',
      category: categoryMap.get('brakes-rotors'),
      brand: brandMap.get('brembo'),
      price: 34000, // $340.00
      currency: 'USD',
      images: [
        {
          url: 'https://images.unsplash.com/photo-1600705722908-bab1e61c0b4d?w=1000&auto=format&fit=crop',
          alt: 'Brembo X-Tra Drilled Rotors Pair',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specifications: [
        { key: 'Diameter', value: '340 mm' },
        { key: 'Pattern', value: 'Cross-Drilled Directional Vanes' },
        { key: 'Coating', value: 'Brembo UV Protective Anti-Corrosion' },
      ],
      compatibility: [
        {
          make: 'Volkswagen',
          model: 'Golf R (MK8)',
          yearFrom: 2021,
          yearTo: 2024,
        },
      ],
      stock: 0, // Out of stock demo
      reservedStock: 0,
      lowStockThreshold: 2,
      status: 'out_of_stock',
      isFeatured: false,
    },
  ];

  for (const prod of productsData) {
    await ProductModel.findOneAndUpdate(
      { sku: prod.sku },
      { $set: prod },
      { upsert: true, new: true },
    );
  }

  console.log('Catalog seeding complete!');
  console.log(`- Seeded ${categoriesData.length} categories.`);
  console.log(`- Seeded ${brandsData.length} brands.`);
  console.log(`- Seeded ${productsData.length} products.`);
  console.log('- Seeded 2 demo accounts:');
  console.log('    Admin:    admin@gridline.com / Admin@123456');
  console.log('    Customer: customer@gridline.com / Customer@123456');

  await mongoose.disconnect();
  console.log('Disconnected from MongoDB.');
}

seed().catch((err) => {
  console.error('Error seeding catalog:', err);
  process.exit(1);
});
