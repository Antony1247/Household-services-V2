export default {
    template: `
    <div>
            <nav class="navbar navbar-dark bg-dark">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/#/customer-dashboard">Customer Dashboard</a>
                    <div>
                    <router-link to="/current-bookings" class="nav-link d-inline text-white">My Bookings</router-link>
                    <router-link to="/booking-history" class="nav-link d-inline text-white">Booking History</router-link>
                    <router-link to="/profile" class="nav-link d-inline text-white">My Profile</router-link>
                    <router-link to="/customer-search" class="nav-link d-inline text-white">Search</router-link>
                    <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                    </div>
                </div>
            </nav>
        <div class="container mt-5">
            <h1 class="text-center">Current Bookings</h1>
            <table class="table table-bordered mt-3">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Service</th>
                        <th>Status</th>
                        <th>Booking Date</th>
                        <th>Booking Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="booking in currentBookings" :key="booking.id">
                        <td>{{ booking.id }}</td>
                        <td>{{ booking.service_name }}</td>
                        <td :class="getStatusClass(booking.status)">{{ booking.status }}</td>
                        <td>{{ booking.booking_date }}</td>
                        <td>{{ booking.booking_time }}</td>
                        <td>
                            <button v-if="booking.status === 'Pending'" class="btn btn-warning me-2" @click="openEditModal(booking)">Edit</button>
                            <button v-if="booking.status === 'Pending'" class="btn btn-danger" @click="cancelBooking(booking.id)">Cancel</button>
                            <button v-if="booking.status === 'Accepted' && booking.professional_id" class="btn btn-info" @click="viewProfessional(booking.professional_id)">
                                View Professional
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Edit Booking Modal -->
            <div v-if="showEditModal" class="modal fade show d-block" style="background: rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Booking</h5>
                            <button type="button" class="close" @click="closeEditModal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="editBooking">
                                <div class="mb-3">
                                    <label>Booking Date</label>
                                    <input type="date" class="form-control" v-model="editBookingData.booking_date" required>
                                </div>
                                <div class="mb-3">
                                    <label>Booking Time</label>
                                    <input type="time" class="form-control" v-model="editBookingData.booking_time" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Save Changes</button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            currentBookings: [],
            showEditModal: false,
            editBookingData: {
                id: null,
                booking_date: "",
                booking_time: ""
            }
        };
    },
    methods: {
        async fetchCurrentBookings() {
            try {
                const response = await axios.get('/api/current_bookings', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.currentBookings = response.data.current_bookings;
            } catch (error) {
                console.error("Error fetching current bookings:", error);
            }
        },
        async cancelBooking(bookingId) {
            if (!confirm("Are you sure you want to cancel this booking?")) return;

            try {
                await axios.delete(`/api/current_bookings?id=${bookingId}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                alert("Booking cancelled successfully!");
                this.fetchCurrentBookings();
            } catch (error) {
                console.error("Error cancelling booking:", error);
                alert("Failed to cancel booking.");
            }
        },
        openEditModal(booking) {
            this.editBookingData = { ...booking };
            this.showEditModal = true;
        },
        closeEditModal() {
            this.showEditModal = false;
            this.editBookingData = { id: null, booking_date: "", booking_time: "" };
        },
        async editBooking() {
            try {
                await axios.put("/api/current_bookings", {
                    id: this.editBookingData.id,
                    booking_date: this.editBookingData.booking_date,
                    booking_time: this.editBookingData.booking_time
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                alert("Booking updated successfully!");
                this.closeEditModal();
                this.fetchCurrentBookings();
            } catch (error) {
                console.error("Error updating booking:", error);
                alert("Failed to update booking.");
            }
        },
        viewProfessional(professionalId) {
            this.$router.push(`/professionals/${professionalId}`);
        },
        getStatusClass(status) {
            if (status === "Accepted") return "text-success";
            if (status === "Pending") return "text-warning";
            return "";
        },
        logout() {
            axios.post('/api/logout', {}, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } })
                .then(() => {
                    localStorage.clear();
                    window.location.href = "/#/login";
                })
                .catch(error => console.error(error));
        }

    },
    mounted() {
        this.fetchCurrentBookings();
    }
};
