export default {
    template: `
    <div>
            <nav class="navbar navbar-dark bg-dark">
                <div class="container-fluid">
                    <a class="navbar-brand" href="/#/customer-dashboard">Customer Dashboard</a>
                    <div>
                        <router-link to="/current-bookings" class="nav-link d-inline text-white">My bookings</router-link>
                        <router-link to="/booking-history" class="nav-link d-inline text-white">booking history</router-link>
                        <router-link to="/profile" class="nav-link d-inline text-white">My profile</router-link>
                        <router-link to="/customer-search" class="nav-link d-inline text-white">Search</router-link>
                        <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                    </div>
                </div>
            </nav>

        <div class="container mt-5">
            <h1 class="text-center">Welcome, {{ customerName }}</h1>

            <h3 class="mt-4">Available Services</h3>
            <table class="table table-bordered mt-3">
                <thead class="table-dark">
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Description</th>
                        <th>Base Price</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="service in availableServices" :key="service.id">
                        <td>{{ service.id }}</td>
                        <td>{{ service.name }}</td>
                        <td>{{ service.description }}</td>
                        <td>{{ service.base_price }}</td>
                        <td>
                            <button class="btn btn-success" @click="openBookingModal(service)">Book</button>
                        </td>
                    </tr>
                </tbody>
            </table>

            <!-- Booking Modal -->
            <div v-if="showBookingModal" class="modal fade show d-block" style="background: rgba(0,0,0,0.5)">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Book {{ selectedService.name }}</h5>
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
            customerName: "",
            availableServices: [],
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
        async fetchCustomerDashboard() {
            try {
                const response = await axios.get('/api/customer_dashboard', {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });
                this.customerName = response.data.customer_name;
                this.availableServices = response.data.available_services;
            } catch (error) {
                console.error("Error fetching dashboard:", error);
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
                    service_id: this.selectedService.id,
                    address: this.booking.address,
                    phone: this.booking.phone,
                    booking_date: this.booking.booking_date,
                    booking_time: this.booking.booking_time
                }, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                alert(response.data.message);
                this.closeBookingModal();
                this.fetchCustomerDashboard();
            } catch (error) {
                console.error("Error booking service:", error);
                alert("Booking failed. Try again.");
            }
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
        this.fetchCustomerDashboard();
    }
};
