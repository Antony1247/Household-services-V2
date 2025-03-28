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
            <h1 class="text-center">Search Services</h1>
            
            <input type="text" class="form-control mt-3" v-model="searchQuery" placeholder="Search by service name" @input="searchServices">
            
            <div v-if="searchResults.length">
                <h3 class="mt-4">Available Services</h3>
                <table class="table table-bordered mt-3">
                    <thead class="table-dark">
                        <tr>
                            <th>Service</th>
                            <th>Description</th>
                            <th>Base Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="result in searchResults" :key="result.service_id">
                            <td>{{ result.service_name }}</td>
                            <td>{{ result.description }}</td>
                            <td>{{ result.base_price }}</td>
                            <td>
                                <button class="btn btn-success" @click="openBookingModal(result)">Book</button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <p v-else-if="searchQuery.length > 2" class="text-center mt-3">No available services found.</p>

            <!-- Booking Modal -->
            <div v-if="showBookingModal" class="modal fade show d-block" style="background: rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Book {{ selectedService.service_name }}</h5>
                            <button type="button" class="close" @click="closeBookingModal">&times;</button>
                        </div>
                        <div class="modal-body">
                            <form @submit.prevent="bookService">
                                <div class="mb-3">
                                    <label>Address</label>
                                    <input type="text" class="form-control" v-model="booking.address" required>
                                </div>
                                <div class="mb-3">
                                    <label>Phone</label>
                                    <input type="text" class="form-control" v-model="booking.phone" required>
                                </div>
                                <div class="mb-3">
                                    <label>Booking Date</label>
                                    <input type="date" class="form-control" v-model="booking.booking_date" required>
                                </div>
                                <div class="mb-3">
                                    <label>Booking Time</label>
                                    <input type="time" class="form-control" v-model="booking.booking_time" required>
                                </div>
                                <button type="submit" class="btn btn-primary">Confirm Booking</button>
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
            searchQuery: "",
            searchResults: [],
            showBookingModal: false,
            selectedService: {},
            booking: {
                address: "",
                phone: "",
                booking_date: "",
                booking_time: ""
            }
        };
    },
    methods: {
        async searchServices() {
            if (this.searchQuery.length < 3) {
                this.searchResults = [];
                return;
            }
            try {
                const response = await axios.get(`/api/customer_search?q=${this.searchQuery}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.searchResults = response.data.results;
            } catch (error) {
                console.error("Error searching services:", error);
            }
        },
        openBookingModal(service) {
            this.selectedService = service;
            this.showBookingModal = true;
        },
        closeBookingModal() {
            this.showBookingModal = false;
            this.booking = {
                address: "",
                phone: "",
                booking_date: "",
                booking_time: ""
            };
        },
        async bookService() {
            try {
                const response = await axios.post("/api/book_service", {
                    service_id: this.selectedService.service_id,
                    address: this.booking.address,
                    phone: this.booking.phone,
                    booking_date: this.booking.booking_date,
                    booking_time: this.booking.booking_time
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                alert(response.data.message);
                this.closeBookingModal();
            } catch (error) {
                console.error("Error booking service:", error);
                alert("Booking failed. Try again.");
            }
        },
        logout() {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            this.$router.push("/login");
        }
    }
};
