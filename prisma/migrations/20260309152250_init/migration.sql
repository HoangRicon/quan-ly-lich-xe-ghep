-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "role" VARCHAR(50) NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "licensePlate" VARCHAR(50) NOT NULL,
    "vehicle_type" VARCHAR(50) NOT NULL DEFAULT 'car',
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "color" VARCHAR(50),
    "brand" VARCHAR(100),
    "model" VARCHAR(100),
    "year" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "owner_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "departure" VARCHAR(255) NOT NULL,
    "destination" VARCHAR(255) NOT NULL,
    "departure_time" TIMESTAMPTZ NOT NULL,
    "arrival_time" TIMESTAMPTZ,
    "price" DECIMAL(10,2) NOT NULL,
    "available_seats" INTEGER NOT NULL DEFAULT 0,
    "total_seats" INTEGER NOT NULL DEFAULT 4,
    "status" VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    "vehicle_id" INTEGER NOT NULL,
    "driver_id" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "trip_id" INTEGER NOT NULL,
    "passenger_id" INTEGER NOT NULL,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "total_price" DECIMAL(10,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_licensePlate_key" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "idx_vehicles_owner" ON "vehicles"("owner_id");

-- CreateIndex
CREATE INDEX "idx_vehicles_plate" ON "vehicles"("licensePlate");

-- CreateIndex
CREATE INDEX "idx_trips_driver" ON "trips"("driver_id");

-- CreateIndex
CREATE INDEX "idx_trips_vehicle" ON "trips"("vehicle_id");

-- CreateIndex
CREATE INDEX "idx_trips_departure_time" ON "trips"("departure_time");

-- CreateIndex
CREATE INDEX "idx_trips_status" ON "trips"("status");

-- CreateIndex
CREATE INDEX "idx_bookings_passenger" ON "bookings"("passenger_id");

-- CreateIndex
CREATE INDEX "idx_bookings_trip" ON "bookings"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "bookings_trip_id_passenger_id_key" ON "bookings"("trip_id", "passenger_id");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_passenger_id_fkey" FOREIGN KEY ("passenger_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
