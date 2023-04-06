
import { PrismaClient, Song } from '@prisma/client'
import express from 'express'
import Redis from 'ioredis'
import { RedisCache } from 'layered-loader/dist/lib/redis'
import { InMemoryCache } from 'layered-loader/dist/lib/memory'
import { LoadingOperation, Loader } from 'layered-loader'

const prisma = new PrismaClient()
const app = express()
app.use(express.json())

const ioRedis = new Redis({
    host: 'localhost',
    port: 6379,
    password: 'sOmE_sEcUrE_pAsS',
})

class ClassifiersLoader implements Loader<string> {
    name = 'Classifiers DB loader'
    isCache = false
    private readonly prismaClient: PrismaClient

    constructor(prismaClient: PrismaClient) {
        this.prismaClient = prismaClient
    }

    async get(key: string): Promise<string | undefined | null> {
        const song = await this.prismaClient.song.findFirst({
            where: { id: Number(key) },
        })
        return song?.title;
    }
}

const operation = new LoadingOperation<string>({
    // this cache will be checked first
    inMemoryCache: {
        ttlInMsecs: 1000 * 60,
        maxItems: 100,
    },

    // this cache will be checked if in-memory one returns undefined
    asyncCache: new RedisCache(ioRedis, {
        json: true, // this instructs loader to serialize passed objects as string and deserialize them back to objects
        ttlInMsecs: 1000 * 60 * 10,
    }),

    // this will be used if neither cache has the requested data
    loaders: [new ClassifiersLoader(prisma)]
})

// If cache is empty, but there is data in the DB, after this operation is completed, both caches will be populated

//* 1. Fetches all released songs.
app.get('/playlist', async (req, res) => {
    const songs = await prisma.song.findMany({
        where: { released: true },
        include: { singer: true }
    })
    res.json({
        success: true,
        payload: songs,
    })
})

//* 2. Fetches a specific song by its ID.
app.get(`/song/:id`, async (req, res) => {
    const { id } = req.params
    const classifier = await operation.get(id)
    console.log(classifier)
    res.json({
        success: true,
        payload: classifier,
    })
})

//* 3. Creates a new artist.
app.post(`/artist`, async (req, res) => {
    const result = await prisma.artist.create({
        data: { ...req.body },
    })
    res.json({
        success: true,
        payload: result,
    })
})

//* 4. Creates (or compose) a new song (unreleased)
app.post(`/song`, async (req, res) => {
    const { title, content, singerEmail } = req.body
    const result = await prisma.song.create({
        data: {
            title,
            content,
            released: false,
            singer: { connect: { email: singerEmail } },
        },
    })
    res.json({
        success: true,
        payload: result,
    })
})

//* 5. Sets the released field of a song to true.
app.put('/song/release/:id', async (req, res) => {
    const { id } = req.params
    const song = await prisma.song.update({
        where: { id: Number(id) },
        data: { released: true },
    })
    res.json({
        success: true,
        payload: song,
    })
})

//* 6. Deletes a song by its ID.
app.delete(`/song/:id`, async (req, res) => {
    const { id } = req.params
    const song = await prisma.song.delete({
        where: { id: Number(id) },
    })
    res.json({
        success: true,
        payload: song,
    })
})

//* 7. Fetches all Artist.
app.get('/artists', async (req, res) => {
    const artists = await prisma.artist.findMany()
    res.json({
        success: true,
        payload: artists,
    })
})

app.use((req, res, next) => {
    res.status(404);
    return res.json({
        success: false,
        payload: null,
        message: `API SAYS: Endpoint not found for path: ${req.path}`,
    });
});

// #6
app.listen(3000, () =>
    console.log('REST API server ready at: http://localhost:3000'),
)