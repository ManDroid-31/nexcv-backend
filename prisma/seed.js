import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Clearing old data...');
  await prisma.resume.deleteMany();
  await prisma.template.deleteMany();
  await prisma.user.deleteMany();
  await prisma.creditTransaction.deleteMany();

  console.log('👥 Creating users...');
  const users = [];
  for (let i = 0; i < 2; i++) {
    const user = await prisma.user.create({
      data: {
        clerkUserId: faker.string.uuid(),
        email: faker.internet.email(),
        name: faker.person.fullName(),
        creditBalance: faker.number.int({ min: 5, max: 20 }),
      },
    });
    users.push(user);
  }

  console.log('🖼️ Creating templates...');
  await prisma.template.create({
    data: {
      key: 'gengar',
      name: 'Gengar',
      description: 'Dark-themed professional template',
      metadata: {
        version: '1.0.0',
        sections: ['education', 'skills', 'experience'],
        previewImage: 'https://cdn.nexcv.com/previews/gengar.png',
      },
    },
  });

  await prisma.template.create({
    data: {
      key: 'azuril',
      name: 'Azuril',
      description: 'Light minimalist theme',
      metadata: {
        version: '1.0.0',
        sections: ['projects', 'skills', 'about'],
        previewImage: 'https://cdn.nexcv.com/previews/azuril.png',
      },
    },
  });

  console.log('📄 Creating resumes & transactions...');
  for (const user of users) {
    await prisma.resume.create({
      data: {
        userId: user.id,
        title: 'Frontend Developer Resume',
        slug: faker.lorem.slug(),
        template: 'gengar',
        visibility: 'private',
        data: {
          name: user.name,
          email: user.email,
          experience: [
            {
              company: 'Google',
              role: 'SWE Intern',
              duration: 'May 2023 - July 2023',
            },
          ],
          skills: ['JavaScript', 'React', 'CSS'],
        },
      },
    });

    await prisma.creditTransaction.createMany({
      data: [
        {
          userId: user.id,
          type: 'earn',
          amount: 10,
          reason: 'daily_bonus',
        },
        {
          userId: user.id,
          type: 'spend',
          amount: 5,
          reason: 'ai_suggestion',
        },
      ],
    });
  }

  console.log('✅ Seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
