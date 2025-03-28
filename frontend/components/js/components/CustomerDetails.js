export default {
    template: `
    <div>
                <!-- Navbar for Admin -->
        <nav class="navbar navbar-dark bg-dark" v-if="isAdmin">

            <div class="container-fluid">
                <a class="navbar-brand" href="/#/admin-dashboard">Admin Dashboard</a>
                <div>
                    <router-link to="/customers" class="nav-link d-inline text-white">Back</router-link>
                </div>
            </div>
        </nav>

        <!-- Navbar for Customer -->
        <nav class="navbar navbar-dark bg-dark" v-else>

            <div class="container-fluid">
                <a class="navbar-brand" href="/#/customer-dashboard">Customer Dashboard</a>
                <div>
                    <router-link to="/profile" class="nav-link d-inline text-white">Back</router-link>
                </div>
            </div>

        </nav>
        <div class="container mt-5">
            <h1 class="text-center">Customer Details</h1>
            <div class="card p-3 shadow">
                <h3>{{ customer.full_name }}</h3>
                <p><strong>Email:</strong> {{ customer.email }}</p>
                <p><strong>Phone:</strong> {{ customer.phone }}</p>
                <p><strong>Address:</strong> {{ customer.address }}</p>
                <p><strong>Status:</strong> 
                    <span :class="{'text-danger': customer.status === 'Blocked', 'text-success': customer.status === 'Unblocked'}">
                        {{ customer.status }}
                    </span>
                </p>
                <h4>Overall Rating: {{ overallRating }}/5</h4>
            </div>

            <div class="row mt-4">
                <div class="col-md-6">
                    <canvas id="statusChart"></canvas>
                </div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            customer: {},
            overallRating: 0,
            statusCounts: {}
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
        async fetchCustomerDetails() {
            try {
                const response = await axios.get(`/api/customers/${this.$route.params.id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
                });

                this.customer = response.data.customer;
                this.overallRating = response.data.overall_rating;
                this.statusCounts = response.data.status_counts;

                this.renderChart();
            } catch (error) {
                console.error("Error fetching customer details:", error);
            }
        },
        renderChart() {
            const ctx = document.getElementById("statusChart").getContext("2d");
            new Chart(ctx, {
                type: "bar",
                data: {
                    labels: ["Completed", "Rejected", "Assigned"],
                    datasets: [{
                        label: "Service Requests",
                        data: [this.statusCounts.Completed, this.statusCounts.Rejected, this.statusCounts.Assigned],
                        backgroundColor: ["#10b981", "#ef4444", "#3b82f6"]
                    }]
                },
                options: {
                    responsive: true,
                    scales: { y: { beginAtZero: true } }
                }
            });
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
        this.fetchCustomerDetails();
    }
};
