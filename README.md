<div align="center">
  <img src="/docs/images/ember-logo.png" alt="Ember" width="550">
</div>

## Ember - Backend
The organized, collaborative, and memorable way to plan your next adventure. Ember brings trip details, shared photos, and personal notes together in one place. It's well-suited for everything from weekend getaways to longer group adventures.

### Coming Soon
[![Ember app preview](./docs/images/ember-preview.webp)](https://tempwebsitefornow.com)

[View the live website](https://tempwebsitefornow.com) · [View the frontend repo](https://github.com/baileykh/ember-fe)

## Motivation
Planning a trip often means juggling details across group chats, notes apps, and photo libraries. These tools can each handle one part of the process, but they make it difficult to keep plans and memories connected in one place. I built Ember to bring trip organization, shared photos, and personal notes together so friends, families, or even the solo-trip taker can coordinate their adventure and revisit their favorite moments with ease.

## Currently in Development:
- [ ] Add Members to Trips
- [x] Remove Members from Trips
- [ ] Edit user profile information
- [ ] Owner transferring between trips

## Quick Start
1. Visit the [Ember website](https://tempwebsitefornow.com).
2. Create an account or sign in.
3. Create a trip and start organizing your next adventure.

## Usage
### Trip Management
Users can create trips with a name, location, description, and optional travel dates. Trip owners can update trip details, replace the banner image, or delete the trip, while both owners and members can view only trips they belong to or have created.

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/api/trips` | List every trip owned by or shared with the current user | Member |
| `POST` | `/api/trips` | Create a trip and register its creator as the owner | Authenticated user |
| `GET` | `/api/trips/:tripId` | View a specific trip | Member |
| `PATCH` | `/api/trips/:tripId` | Update one or more trip details without overwriting omitted fields | Owner |
| `PUT` | `/api/trips/:tripId/banner` | Upload or replace a trip banner | Owner |
| `DELETE` | `/api/trips/:tripId` | Delete a trip and its related data | Owner |

Trip dates use the `YYYY-MM-DD` format, and Ember prevents an end date from being set before the start date. Requests for trips outside the current user's membership return the same not-found response as nonexistent trips, avoiding disclosure of private trip IDs.

### Profile Images and Trip Photos
Image uploads use `multipart/form-data` with a single field named `image`. JPEG, PNG, and WebP files are decoded and verified before storage rather than being trusted by their filename or reported MIME type.

| Media | Endpoint | Maximum upload | Processing | Visibility |
| --- | --- | ---: | --- | --- |
| Profile image | `PUT /api/me/profile-image` | 5 MB | Center-cropped to `512 × 512` | Public URL |
| Trip banner | `PUT /api/trips/:tripId/banner` | 5 MB | Attention-cropped to `1600 × 600` | Member-only signed URL |
| Trip photo | `POST /api/trips/:tripId/photos` | 10 MB | Constrained to `2400 × 2400` with a `600 × 600` thumbnail | Member-only signed URLs |

Every accepted image is auto-oriented, converted to WebP, compressed, and written without its original metadata. Replacing a profile image or banner removes the previous object after the new database path is saved. Failed uploads and database writes trigger storage cleanup to reduce orphaned files.

### Shared Trip Galleries
Every trip member can upload and view photos. Gallery responses use thumbnails, while the individual photo endpoint returns the larger stored version only when a user opens it. Private Supabase objects are returned through signed URLs that expire after an hour.

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/api/trips/:tripId/photos` | Browse newest-first thumbnail results | Member |
| `POST` | `/api/trips/:tripId/photos` | Upload a photo and generate its thumbnail | Member |
| `GET` | `/api/trips/:tripId/photos/:photoId` | View a full trip photo and its uploader | Member |
| `DELETE` | `/api/trips/:tripId/photos/:photoId` | Delete a photo | Uploader or trip owner |

Gallery results use cursor pagination for stable loading as new photos are added.

### Personal Trip Notes
Trip notes belong to a trip but remain private to their author. Members can use them for packing reminders, favorite locations, lessons learned, or anything else they want associated with the trip without sharing it with the rest of the group.

| Method | Endpoint | Description | Access |
| --- | --- | --- | --- |
| `GET` | `/api/trips/:tripId/notes` | List the current user's notes for a trip | Note author and current member |
| `POST` | `/api/trips/:tripId/notes` | Create a private note | Current member |
| `GET` | `/api/trips/:tripId/notes/:noteId` | View one private note | Note author and current member |
| `PATCH` | `/api/trips/:tripId/notes/:noteId` | Update a note's title, content, or both | Note author and current member |
| `DELETE` | `/api/trips/:tripId/notes/:noteId` | Delete a private note | Note author and current member |

Notes remain stored if a member is removed from a trip but become inaccessible until that membership is restored. Deleting the trip permanently removes all notes associated with it.

## Contributing
Want to explore Ember locally or contribute to its development? The project includes its database migrations and an env template so you can get the API running with a fresh Supabase project.

### Prerequisites
Before getting started, install or create:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/) `24.18.0` and npm
- A [Supabase](https://supabase.com/) project for PostgreSQL and object storage

The repository includes an `.nvmrc` file, so [nvm](https://github.com/nvm-sh/nvm) users can install and select the correct Node version with `nvm install`.

### 1. Clone and Install
```bash
git clone https://github.com/BaileyKH/ember-be.git
cd ember-be
nvm install
npm ci
```

If you do not use nvm, install Node `24.18.0` and ignore the `nvm install` command.

### 2. Configure Supabase
Create three storage buckets in your Supabase project:

| Bucket | Visibility | Purpose |
| --- | --- | --- |
| `profile-images` | Public | User profile images 
| `trip-banners` | Private | Member-only trip banners 
| `trip-photos` | Private | Full trip photos and gallery thumbnails 

### 3. Configure the Environment
You can either rename .env.example to .env or simply create a fresh .env file and copy the examples data replacing the placeholder information

| Variable | Description |
| --- | --- |
| `DB_URL` | PostgreSQL connection string for the Supabase database |
| `PORT` | Local API port, such as `8080` |
| `PLATFORM` | Use `dev` to enable development-only behavior (such as the reset endpoint for resetting the database) |
| `JWT_SECRET` | Long, unpredictable secret used to sign access tokens |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SECRET` | Server-side Supabase secret or service-role key |

You can create a JWT secret with:

```bash
openssl rand -base64 32
```

### 4. Prepare the Database
Apply the drizzle migrations to your supabase database:

```bash
npm run migrate
```

### 5. Start the Server
Compile and start the server:

```bash
npm run dev
```

