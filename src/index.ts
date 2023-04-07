
import { PrismaClient, Song, Artist } from '@prisma/client'
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

class ClassifiersLoader implements Loader<Artist[] | Song | Song[]> {
    name = 'Classifiers DB loader'
    isCache = false
    private readonly prismaClient: PrismaClient

    constructor(prismaClient: PrismaClient) {
        this.prismaClient = prismaClient
    }

    async get(key: string): Promise<Artist[] | Song | Song[] | undefined | null> {
        /*
        song_<id>
        playlist
        artists
        */
        if (key === 'artists')
            return await this.prismaClient.artist.findMany()
        if (key === 'playlist')
            return await prisma.song.findMany({
                where: { released: true },
                include: { singer: true }
            })
        if (key.startsWith('song_'))
        {
            const song = await this.prismaClient.song.findFirst({
                where: { id: Number(key.split('_')[1]) },
            })
            console.log(song)
            return song;
        }
        return undefined
    }
}

const operation = new LoadingOperation<Artist[] | Song | Song[]>({
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
    console.log("Get playlist")
    const songs = await operation.get('playlist')
    res.json({
        success: true,
        payload: songs,
    })
})

//* 2. Fetches a specific song by its ID.
app.get(`/song/:id`, async (req, res) => {
    const { id } = req.params
    console.log("Get Song by ID", id)

    let song = await operation.get('song_' + id)
    if (!song) {
        await operation.invalidateCacheFor('song_' + id)
        song = await operation.get('song_' + id)
    }
    res.json({
        success: true,
        payload: song,
    })
})

//* 7. Fetches all Artist.
app.get('/artists', async (req, res) => {
    console.log("Get Artists")
    const artists = await operation.get('artists')
    res.json({
        success: true,
        payload: artists,
    })
})

//* 3. Creates a new artist.
app.post(`/artist`, async (req, res) => {
    console.log("Create Artist", req.body.name)
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
    console.log("Create Song", req.body.title)
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
    console.log("release song", req.params.id)
    const { id } = req.params
    const song = await prisma.song.update({
        where: { id: Number(id) },
        data: { released: true },
    })
    await operation.invalidateCacheFor('playlist')
    await operation.invalidateCacheFor('song_' + id)
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
    await operation.invalidateCacheFor('song_' + id)
    if(song.released) await operation.invalidateCacheFor('playlist')
    res.json({
        success: true,
        payload: song,
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