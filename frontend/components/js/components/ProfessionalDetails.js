export default {
    template: `
    <div>
        <!-- Navbar for Admin -->
        <nav class="navbar navbar-dark bg-dark" v-if="isAdmin">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                <div>
                    <router-link to="/professionalsList" class="nav-link d-inline text-white">Back</router-link>
                </div>
            </div>
        </nav>

        <!-- Navbar for Professional -->
        <nav class="navbar navbar-dark bg-dark" v-else-if="isProfessional">
            <div class="container-fluid">
                <a class="navbar-brand" href="/#/professional-dashboard">Professional Dashboard</a>
                <div>
                    <router-link to="/assigned-requests" class="nav-link d-inline text-white">Accepted Requests</router-link>
                    <router-link to="/completed-requests" class="nav-link d-inline text-white">request history</router-link>
                    <router-link to="/professional-profile" class="nav-link d-inline text-white">My Profile</router-link>
                    <button @click="logout" class="btn btn-danger ms-3">Logout</button>
                </div>
            </div>
        </nav>

        <!-- Navbar for Customer -->
        <nav class="navbar navbar-dark bg-dark" v-else>
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
            <h1 class="text-center">Professional Details</h1>
            
            <div v-if="professional">
                <h3>{{ professional.full_name }}</h3>
                <p><strong>Specialization:</strong> {{ professional.specialization }}</p>
                <p><strong>Experience:</strong> {{ professional.experience }} years</p>
                <p><strong>Overall Rating:</strong> {{ overallRating }}</p>

                <div class="row mt-4">
                    <div class="col-md-6">
                        <div class="card shadow p-3">
                            <h4 class="text-center">Customer Ratings Summary</h4>
                            <canvas ref="ratingChart"></canvas>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="card shadow p-3">
                            <h4 class="text-center">Service Requests Status</h4>
                            <canvas ref="statusChart"></canvas>
                        </div>
                    </div>
                </div>

                <h3 class="mt-5">Completed Service Requests</h3>
                <ul v-if="serviceRequests.length">
                    <li v-for="request in serviceRequests" :key="request.id">
                        Service: {{ request.service_name }} | Rating: {{ request.rating }} | Review: {{ request.review }}
                    </li>
                </ul>
                <p v-else>No completed requests found.</p>
            </div>
            <p v-else>Loading professional details...</p>
        </div>
    </div>
    `,
    
    data() {
        return {
            professional: null,
            serviceRequests: [],
            overallRating: 0,
            statusCounts: { Completed: 0, Rejected: 0, Assigned: 0 },
            ratingDistribution: [0, 0, 0, 0, 0], 
            statusChartInstance: null, 
            ratingChartInstance: null  
        };
    },

    computed: {
        isAdmin() {
            return localStorage.getItem("role") === "Admin";
        },
        isProfessional() {
            return localStorage.getItem("role") === "Professional";
        }
    },

    methods: {
        async fetchProfessionalDetails() {
            try {
                const response = await axios.get(`/api/professionals/${this.$route.params.professional_id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                this.professional = response.data.professional;
                this.serviceRequests = response.data.service_requests;
                this.overallRating = response.data.overall_rating;
                this.statusCounts = response.data.status_counts;

                this.processRatings();
                this.$nextTick(() => {
                    this.destroyCharts();  // Ensure old charts are removed
                    this.renderCharts();
                });
            } catch (error) {
                console.error("Error fetching professional details:", error);
            }
        },

        processRatings() {
            this.ratingDistribution = [0, 0, 0, 0, 0];

            this.serviceRequests.forEach(req => {
                if (req.rating >= 1 && req.rating <= 5) {
                    this.ratingDistribution[req.rating - 1]++;
                }
            });
        },

        renderCharts() {
            if (this.$refs.statusChart && this.$refs.ratingChart) {
                this.renderStatusChart();
                this.renderRatingChart();
            }
        },

        renderStatusChart() {
            const ctx = this.$refs.statusChart.getContext("2d");
            this.statusChartInstance = new Chart(ctx, {
                type: "doughnut",
                data: {
                    labels: ["Completed", "Rejected", "Assigned"],
                    datasets: [{
                        label: "Service Requests",
                        data: [
                            this.statusCounts.Completed,
                            this.statusCounts.Rejected,
                            this.statusCounts.Assigned
                        ],
                        backgroundColor: ["#28a745", "#dc3545", "#007bff"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: "top" }
                    }
                }
            });
        },

        renderRatingChart() {
            const ctx = this.$refs.ratingChart.getContext("2d");
            this.ratingChartInstance = new Chart(ctx, {
                type: "bar",
                data: {
                    labels: ["1 Star", "2 Stars", "3 Stars", "4 Stars", "5 Stars"],
                    datasets: [{
                        label: "Ratings Count",
                        data: this.ratingDistribution,
                        backgroundColor: ["#dc3545", "#fd7e14", "#ffc107", "#28a745", "#007bff"]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        },

        destroyCharts() {
            if (this.statusChartInstance) {
                this.statusChartInstance.destroy();
                this.statusChartInstance = null;
            }
            if (this.ratingChartInstance) {
                this.ratingChartInstance.destroy();
                this.ratingChartInstance = null;
            }
        },
        logout() {
            localStorage.removeItem("token");
            localStorage.removeItem("role");
            this.$router.push("/login");
        }
    },

    watch: {
        serviceRequests: {
            handler() {
                this.$nextTick(() => {
                    this.destroyCharts(); 
                    this.renderCharts();
                });
            },
            deep: true
        },
        statusCounts: {
            handler() {
                this.$nextTick(() => {
                    this.destroyCharts();
                    this.renderCharts();
                });
            },
            deep: true
        }
    },

    mounted() {
        this.fetchProfessionalDetails();
    },

    beforeUnmount() {
        this.destroyCharts();
    },

    beforeRouteLeave(to, from, next) {
        this.destroyCharts(); // Ensure charts are destroyed when leaving
        next();
    },

    beforeRouteEnter(to, from, next) {
        next(vm => {
            vm.fetchProfessionalDetails(); // Re-fetch data when navigating back
        });
    },

    beforeRouteUpdate(to, from, next) {
        this.fetchProfessionalDetails(); // Ensure data refresh when switching professionals
        next();
    }
};
