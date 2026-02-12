import bcrypt from 'bcryptjs'
import 'dotenv/config';
import { PrismaClient } from './generated/';
import { PrismaPg } from '@prisma/adapter-pg';
console.log(process.env.DATABASE_URL)
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Test Data ──────────────────────────────────────────────────────────
const AREAS = [
    "Dayanand college",
    "Collector office",
    "Nikki bar",
    "Khadgav road",
    "Tution area",
    "Civil hospital",
    "Khori galli madina masjid",
    "Khori galli Ayesha colony",
    "Old Renapur naka",
    "Medical College",
    "Bus stand",
    "Golai",
    "Nanded road",
    "Railway station",
    "Sohail Nagar",
];

const FIRST_NAMES = [
    "Ahmed", "Mohammed", "Ali", "Hassan", "Ibrahim",
    "Yusuf", "Omar", "Bilal", "Hamza", "Zaid",
    "Fatima", "Aisha", "Khadija", "Maryam", "Zainab",
    "Safiya", "Noor", "Amina", "Huda", "Sara",
];

const LAST_NAMES = [
    "Khan", "Sheikh", "Ansari", "Siddiqui", "Qureshi",
    "Patel", "Malik", "Hussain", "Rizvi", "Farooqi",
];

const LANDMARKS = [
    "Near Jama Masjid", "Green gate house", "Behind school",
    "Next to petrol pump", "Corner building", "White tower",
    "Near water tank", "Opposite park", "Blue compound wall",
    "Near bus stop", "Above medical store", "Behind bakery",
];

const ADDRESSES = [
    "Flat 101, Star Heights", "House 23, Main Road", "B-12, Rose Apartments",
    "H.No 45, 2nd Floor", "Ground Floor, Al Noor Complex", "Flat 3A, Crescent Tower",
    "Shop Top Floor, Market Road", "House 78, Lane 5", "D-Block, Hilal Society",
    "Flat 6, Sun View Apts", "H.No 12, Old City Road", "2nd Floor, Zaheer Manzil",
    "Flat 202, Mashallah Heights", "H.No 99, Bypass Road", "Ground Floor, Madinah Complex",
];

function randomFrom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomPhone(): string {
    const prefixes = ['70', '80', '90', '98', '99', '88', '77', '63', '73', '62'];
    return randomFrom(prefixes) + Math.floor(10000000 + Math.random() * 90000000).toString();
}

async function main() {
    const hashedPin = await bcrypt.hash('3055', 10)

    // 1. Seed Areas
    console.log('Seeding areas...')
    for (const name of AREAS) {
        await prisma.area.upsert({
            where: { name },
            update: {},
            create: { name, count: 0 }
        })
    }

    // 2. Seed Admin
    console.log('Seeding admin...')
    await prisma.user.upsert({
        where: { phone: '9999999999' },
        update: {},
        create: {
            name: 'System Admin',
            phone: '9999999999',
            pin: hashedPin,
            role: 'ADMIN',
            address: 'NGO HQ',
            landmark: 'Main Gate',
            area: 'Central',
            verified: true
        }
    })

    // // 3. Seed Volunteers (one per area)
    // console.log('Seeding volunteers...')
    // const volunteerNames = [
    //     'Zaid Volunteer', 'Tariq Helper', 'Imran Rider',
    //     'Owais Delivery', 'Junaid Carrier', 'Rizwan Runner', 'Saqib Driver',
    //     'Arshad Rider', 'Salman Helper', 'Irfan Carrier', 'Asif Delivery',
    //     'Majid Runner', 'Sajid Driver', 'Naved Rider', 'Khalid Helper',
    // ];
    // const volunteerPhones = [
    //     '8888888881', '8888888882', '8888888883',
    //     '8888888884', '8888888885', '8888888886', '8888888887',
    //     '8888888888', '8888888889', '8888888890', '8888888891',
    //     '8888888892', '8888888893', '8888888894', '8888888895',
    // ];

    // for (let i = 0; i < AREAS.length; i++) {
    //     const vUser = await prisma.user.upsert({
    //         where: { phone: volunteerPhones[i] },
    //         update: {},
    //         create: {
    //             name: volunteerNames[i],
    //             phone: volunteerPhones[i],
    //             pin: hashedPin,
    //             role: 'VOLUNTEER',
    //             address: `Volunteer Hub ${i + 1}`,
    //             landmark: 'Near Clock tower',
    //             area: AREAS[i],
    //             verified: true
    //         }
    //     })

    //     await prisma.volunteer.upsert({
    //         where: { userId: vUser.id },
    //         update: {},
    //         create: {
    //             userId: vUser.id,
    //             areas: [AREAS[i]],
    //             available: true
    //         }
    //     })
    // }

    // // 4. Seed 50+ users with bookings spread across all areas
    // console.log('Seeding test users & bookings...')
    // const bookingStart = new Date()
    // bookingStart.setHours(0, 0, 0, 0)
    // bookingStart.setDate(bookingStart.getDate() + 1) // Tomorrow
    // const bookingEnd = new Date(bookingStart.getTime() + 30 * 24 * 60 * 60 * 1000)

    // const usedPhones = new Set<string>();
    // let userCount = 0;

    // for (const area of AREAS) {
    //     // 7-10 users per area = ~50-70 total
    //     const usersInArea = 7 + Math.floor(Math.random() * 4);

    //     for (let j = 0; j < usersInArea; j++) {
    //         let phone = randomPhone();
    //         while (usedPhones.has(phone)) phone = randomPhone();
    //         usedPhones.add(phone);

    //         const firstName = randomFrom(FIRST_NAMES);
    //         const lastName = randomFrom(LAST_NAMES);
    //         const hasAlt = Math.random() > 0.5;
    //         let altPhone: string | undefined;
    //         if (hasAlt) {
    //             altPhone = randomPhone();
    //             while (usedPhones.has(altPhone)) altPhone = randomPhone();
    //         }

    //         const user = await prisma.user.create({
    //             data: {
    //                 name: `${firstName} ${lastName}`,
    //                 phone,
    //                 alternatePhone: altPhone || null,
    //                 pin: hashedPin,
    //                 role: 'USER',
    //                 address: randomFrom(ADDRESSES),
    //                 landmark: randomFrom(LANDMARKS),
    //                 area,
    //                 verified: Math.random() > 0.15, // 85% verified
    //             }
    //         })

    //         const tiffinCount = 1 + Math.floor(Math.random() * 3); // 1-3
    //         const booking = await prisma.booking.create({
    //             data: {
    //                 userId: user.id,
    //                 tiffinCount,
    //                 startDate: bookingStart,
    //                 endDate: bookingEnd,
    //                 type: 'RECURRING',
    //                 status: Math.random() > 0.1 ? 'ACTIVE' : 'CANCELLED', // 90% active
    //             }
    //         })

    //         // ~20% of bookings have a modification for today
    //         if (Math.random() > 0.8) {
    //             const cancelled = Math.random() > 0.5;
    //             await prisma.bookingModification.create({
    //                 data: {
    //                     bookingId: booking.id,
    //                     date: bookingStart,
    //                     tiffinCount: cancelled ? null : Math.max(1, tiffinCount + (Math.random() > 0.5 ? 1 : -1)),
    //                     cancelled,
    //                     reason: cancelled ? 'Not needed today' : 'Extra guests',
    //                 }
    //             })
    //         }

    //         userCount++;
    //     }
    // }

    // 5. Seed Global Config
    console.log('Seeding global config...')
    await prisma.globalConfig.upsert({
        where: { id: 'singleton' },
        update: {},
        create: {
            id: 'singleton',
            ramadanStarted: false,
            ramadanEnded: false,
            officialStartDate: null
        }
    })

    console.log(`Seed completed! Created ${90} users across ${AREAS.length} areas with ${AREAS.length} volunteers.`)
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
