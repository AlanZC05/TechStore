/**
 * In-Memory Product Repository (DAO Pattern mirroring `products` SQL table in database/schema.sql)
 * Seeded with 6 hardware products across GPUs, CPUs, Monitors, and Mechanical Keyboards.
 */
class ProductRepository {
  constructor() {
    this.products = [];
    this.seed();
  }

  seed() {
    this.products = [
      {
        id: 'prd_gpu_4080s',
        sku: 'GPU-NV-4080S-16G',
        name: 'NVIDIA GeForce RTX 4080 Super 16GB GDDR6X',
        category: 'GPUs',
        description: 'Ada Lovelace architecture flagship GPU with DLSS 3.5 Frame Generation and triple-fan vapor chamber cooling.',
        priceMxn: 21999.00,
        stock: 12
      },
      {
        id: 'prd_gpu_7900xt',
        sku: 'GPU-AMD-7900XT-20G',
        name: 'AMD Radeon RX 7900 XT 20GB GDDR6',
        category: 'GPUs',
        description: 'High-bandwidth RDNA 3 graphics card engineered for ultra-high-refresh 4K & 1440p gaming workloads.',
        priceMxn: 15899.00,
        stock: 9
      },
      {
        id: 'prd_cpu_9800x3d',
        sku: 'CPU-AMD-9800X3D',
        name: 'AMD Ryzen 7 9800X3D 8-Core 5.2GHz AM5 Processor',
        category: 'CPUs',
        description: '2nd-Gen 3D V-Cache Zen 5 desktop processor with 104MB total cache for extreme gaming and compilation throughput.',
        priceMxn: 10499.00,
        stock: 18
      },
      {
        id: 'prd_cpu_14700k',
        sku: 'CPU-INT-14700K',
        name: 'Intel Core i7-14700K 20-Core (8P+12E) 5.6GHz LGA1700',
        category: 'CPUs',
        description: 'Unlocked hybrid desktop processor delivering 28 threads for heavy multitasking, virtualization, and 3D rendering.',
        priceMxn: 8299.00,
        stock: 21
      },
      {
        id: 'prd_mon_oled27',
        sku: 'MON-LG-27GS95QE',
        name: 'UltraGear 27" QHD 240Hz OLED 0.03ms Gaming Monitor',
        category: 'Monitors',
        description: '2560x1440 MLA+ OLED panel with DisplayHDR True Black 400, HDMI 2.1, DisplayPort 1.4, and G-SYNC compatibility.',
        priceMxn: 16499.00,
        stock: 7
      },
      {
        id: 'prd_kbd_q1pro',
        sku: 'KBD-KEY-Q1PRO-ES',
        name: 'Keychron Q1 Pro QMK/VIA Wireless Custom Mechanical Keyboard',
        category: 'Mechanical Keyboards',
        description: 'Full CNC machined 6063 aluminum body, double-gasket mount, hot-swappable tactile switches, and PBT keycaps.',
        priceMxn: 4199.00,
        stock: 25
      }
    ];
  }

  findAll() {
    return this.products.map((product) => ({ ...product }));
  }

  findById(id) {
    const product = this.products.find((p) => p.id === id);
    return product ? { ...product } : null;
  }
}

module.exports = new ProductRepository();

